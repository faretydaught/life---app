# ============================================================
# Phone (Android) PWA install server
# - Creates / reuses a local root CA and a server certificate
# - Port 8765 (HTTP): install guide + RootCA download
# - Port 8766 (HTTPS): serves the PWA
# Runs as current user (uses TcpListener + SslStream, no admin needed)
# ============================================================
$ErrorActionPreference = 'Stop'

$dirName = [string][char]0x751F + [string][char]0x6D3B + 'app'
$PROJ = Join-Path 'C:\Users\ASUS\Desktop' $dirName
$TOOL = Join-Path $PROJ 'tools'
$CERT = Join-Path $TOOL 'cert'
if (-not (Test-Path $CERT)) { New-Item -ItemType Directory -Path $CERT | Out-Null }

$pfxPwd = 'ledger-local-2026'
$securePwd = ConvertTo-SecureString -String $pfxPwd -Force -AsPlainText

$rootPfx   = Join-Path $CERT 'root.pfx'
$rootCer   = Join-Path $CERT 'root.cer'
$serverPfx = Join-Path $CERT 'server.pfx'

# ---------------- Detect LAN IPv4 ----------------
$candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and
                 $_.IPAddress -notlike '169.254.*' -and
                 $_.AddressState -eq 'Preferred' }
$ip = ($candidates | Sort-Object -Property PrefixOrigin -Descending |
  Select-Object -First 1).IPAddress
if (-not $ip) { throw 'Could not detect LAN IPv4 address.' }

# RSA key that is exportable (default CNG key is not, which would
# produce PFX files without a private key)
function New-RsaKey([int]$bits) {
  $kcp = New-Object System.Security.Cryptography.CngKeyCreationParameters
  $kcp.ExportPolicy = [System.Security.Cryptography.CngExportPolicies]::AllowExport
  $kcp.KeyUsage = [System.Security.Cryptography.CngKeyUsages]::AllUsages
  $lenProp = New-Object System.Security.Cryptography.CngProperty(
    'Length', [BitConverter]::GetBytes([int]$bits),
    [System.Security.Cryptography.CngPropertyOptions]::None)
  $kcp.Parameters.Add($lenProp) | Out-Null
  $keyName = 'ledger-' + [guid]::NewGuid().ToString('N')
  $cngKey = [System.Security.Cryptography.CngKey]::Create(
    [System.Security.Cryptography.CngAlgorithm]::Rsa, $keyName, $kcp)
  $rsa = New-Object System.Security.Cryptography.RSACng($cngKey)
  return $rsa
}

# ---------------- Certificates (in-memory, no cert store) ----------------
function New-RootCA {
  $key = New-RsaKey 2048
  $dn = New-Object System.Security.Cryptography.X509Certificates.X500DistinguishedName(
    'CN=My Life Ledger Local CA')
  $req = New-Object System.Security.Cryptography.X509Certificates.CertificateRequest(
    $dn, $key,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)

  $basic = New-Object System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension(
    $true, $true, 0, $true)
  $kuFlags = [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign -bor
             [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::CRLSign -bor
             [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature
  $ku = New-Object System.Security.Cryptography.X509Certificates.X509KeyUsageExtension(
    $kuFlags, $true)
  $req.CertificateExtensions.Add($basic) | Out-Null
  $req.CertificateExtensions.Add($ku) | Out-Null

  $nb = [System.DateTimeOffset]::Now.AddDays(-2)
  $na = [System.DateTimeOffset]::Now.AddYears(10)
  return $req.CreateSelfSigned($nb, $na)
}

function New-ServerCert($root, $ip) {
  $key = New-RsaKey 2048
  $dn = New-Object System.Security.Cryptography.X509Certificates.X500DistinguishedName(
    "CN=$ip")
  $req = New-Object System.Security.Cryptography.X509Certificates.CertificateRequest(
    $dn, $key,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)

  $oidCol = New-Object System.Security.Cryptography.OidCollection
  $oidCol.Add((New-Object System.Security.Cryptography.Oid('1.3.6.1.5.5.7.3.1'))) | Out-Null
  $eku = New-Object System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension(
    $oidCol, $false)
  $req.CertificateExtensions.Add($eku) | Out-Null

  $san = New-Object System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder
  $san.AddIpAddress([System.Net.IPAddress]::Parse($ip))
  $san.AddIpAddress([System.Net.IPAddress]::Loopback)
  $req.CertificateExtensions.Add($san.Build()) | Out-Null

  $ku2Flags = [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor
              [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment
  $req.CertificateExtensions.Add(
    (New-Object System.Security.Cryptography.X509Certificates.X509KeyUsageExtension(
      $ku2Flags, $true))) | Out-Null

  $nb = [System.DateTimeOffset]::Now.AddDays(-2)
  $na = [System.DateTimeOffset]::Now.AddYears(10).AddDays(-1)
  $serial = New-Object byte[] 10
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($serial)
  $serial[0] = $serial[0] -band 0x7F
  $issued = $req.Create($root, $nb, $na, $serial)
  # Create() returns a public-key-only cert; attach our private key
  return [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::CopyWithPrivateKey(
    $issued, $key)
}

if (Test-Path $rootPfx) {
  Write-Host 'Reusing existing root CA'
  $root = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
    $rootPfx, $pfxPwd)
} else {
  Write-Host 'Creating root CA ...'
  $root = New-RootCA

  [System.IO.File]::WriteAllBytes($rootCer,
    $root.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
  [System.IO.File]::WriteAllBytes($rootPfx,
    $root.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, $pfxPwd))
  Write-Host 'Root CA created.'
}

if (Test-Path $serverPfx) {
  Write-Host 'Reusing existing server certificate'
} else {
  Write-Host 'Creating server certificate ...'
  $server = New-ServerCert $root $ip
  [System.IO.File]::WriteAllBytes($serverPfx,
    $server.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, $pfxPwd))
  Write-Host 'Server certificate created.'
}

$serverCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
  $serverPfx, $pfxPwd)

# ---------------- HTTP primitives ----------------
function Get-RequestText($stream) {
  $buf = New-Object byte[] 4096
  $n = $stream.Read($buf, 0, $buf.Length)
  if ($n -le 0) { return '' }
  return [System.Text.Encoding]::ASCII.GetString($buf, 0, $n)
}

function Send-Bytes($stream, $status, $contentType, $bytes) {
  $len = 0
  if ($bytes) { $len = $bytes.Length }
  $head = "HTTP/1.1 $status`r`n" +
          "Content-Type: $contentType`r`n" +
          "Content-Length: $len`r`n" +
          "Connection: close`r`n" +
          "Cache-Control: no-cache`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($hb, 0, $hb.Length)
  if ($bytes) { $stream.Write($bytes, 0, $bytes.Length) }
  $stream.Flush()
}

function Get-Mime($path) {
  switch ([System.IO.Path]::GetExtension($path)) {
    '.html'        { 'text/html; charset=utf-8' }
    '.css'         { 'text/css; charset=utf-8' }
    '.js'          { 'application/javascript; charset=utf-8' }
    '.webmanifest' { 'application/manifest+json; charset=utf-8' }
    '.png'         { 'image/png' }
    '.json'        { 'application/json; charset=utf-8' }
    default        { 'application/octet-stream' }
  }
}

# Safe project file lookup (no path traversal)
function Resolve-ProjectFile($rel) {
  $rel = [Uri]::UnescapeDataString($rel)
  $candidate = [System.IO.Path]::GetFullPath((Join-Path $PROJ ($rel.TrimStart('/'))))
  $rootFull = [System.IO.Path]::GetFullPath($PROJ)
  if ($candidate.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -and
      (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    return $candidate
  }
  return $null
}

# ---------------- Port 18765: guide + CA ----------------
function Handle-Guide($client) {
  $stream = $client.GetStream()
  $stream.ReadTimeout = 5000
  try {
    $txt = Get-RequestText $stream
    $line = ($txt -split "`r`n")[0]
    $path = ($line -split ' ')[1]
    if (-not $path) { $path = '/' }
    if ($path -eq '/' -or $path -eq '/index.html') {
      $bytes = [System.IO.File]::ReadAllBytes((Join-Path $TOOL 'install.html'))
      Send-Bytes $stream '200 OK' 'text/html; charset=utf-8' $bytes
    } elseif ($path -eq '/RootCA.cer') {
      $bytes = [System.IO.File]::ReadAllBytes($rootCer)
      Send-Bytes $stream '200 OK' 'application/pkix-cert' $bytes
    } else {
      Send-Bytes $stream '404 Not Found' 'text/plain' ($null)
    }
  } finally {
    $client.Close()
  }
}

# ---------------- Port 18766: HTTPS PWA ----------------
function Handle-Pwa($client) {
  $raw = $client.GetStream()
  $raw.ReadTimeout = 8000
  $ssl = New-Object System.Net.Security.SslStream($raw, $false)
  try {
    $prot = [System.Net.SecurityProtocolType]::Tls12
    $tls13 = [System.Net.SecurityProtocolType]12288
    if ([Enum]::IsDefined([System.Net.SecurityProtocolType], $tls13)) {
      $prot = $prot -bor $tls13
    }
    $ssl.AuthenticateAsServer($serverCert, $false, $prot, $false)
    $ssl.ReadTimeout = 8000
    $txt = Get-RequestText $ssl
    $line = ($txt -split "`r`n")[0]
    $path = ($line -split ' ')[1]
    if (-not $path) { $path = '/' }
    if ($path.EndsWith('/')) { $path += 'index.html' }

    $file = Resolve-ProjectFile $path
    if ($file) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      Send-Bytes $ssl '200 OK' (Get-Mime $file) $bytes
    } else {
      Send-Bytes $ssl '404 Not Found' 'text/plain' ($null)
    }
  } finally {
    $client.Close()
  }
}

# ---------------- Start ----------------

# Detect IP change (cert SAN is bound to IP, stale cert breaks HTTPS)
$certIp = $null
try {
  $existingCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2(
    $serverPfx, $pfxPwd)
  $sanExt = $existingCert.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.17' }
  if ($sanExt) {
    $sanText = $sanExt.Format($true)
    if ($sanText -match 'IPAddress=([\d.]+)') { $certIp = $Matches[1] }
  }
} catch { }

if ($certIp -and $certIp -ne $ip) {
  Write-Host ''
  Write-Host '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
  Write-Host (' WARNING: Current IP (' + $ip + ') differs from')
  Write-Host (' the IP in the existing certificate (' + $certIp + ').')
  Write-Host ' Please delete the server.pfx in tools/cert/'
  Write-Host ' and re-run this script to regenerate the cert.'
  Write-Host '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
  Write-Host ''
  exit 1
}

$guide = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, 18765)
$pwa   = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, 18766)
$guide.Start()
$pwa.Start()

# Ask user to allow firewall access
Write-Host ''
Write-Host '=================================================='
Write-Host ' Phone install server is running'
Write-Host ''
Write-Host ' [IMPORTANT] If a Windows Firewall dialog popped up'
Write-Host ' asking about PowerShell network access, click "Allow".'
Write-Host ''
Write-Host (' Computer LAN IP: ' + $ip)
Write-Host ''
Write-Host ' On the Android phone (same WiFi), open in Chrome:'
Write-Host ('   http://' + $ip + ':18765/')
Write-Host ''
Write-Host ' Keep this window OPEN until the app is added to'
Write-Host ' home screen and verified offline.'
Write-Host '=================================================='
Write-Host ''

try {
  while ($true) {
    if ($guide.Pending()) {
      $c = $guide.AcceptTcpClient()
      try { Handle-Guide $c } catch { }
    }
    if ($pwa.Pending()) {
      $c = $pwa.AcceptTcpClient()
      try { Handle-Pwa $c } catch { }
    }
    Start-Sleep -Milliseconds 15
  }
} finally {
  $guide.Stop()
  $pwa.Stop()
}
