#Requires -Version 7.3
param([string]$Output = "responsive-audit.json", [string]$Session = "team-qa", [switch]$PublicOnly, [string[]]$Paths = @(), [int]$PauseSeconds = 12)
$ErrorActionPreference = "Stop"
$publicPages = @("/", "/contact", "/privacy-policy", "/terms-and-conditions", "/privacy/request", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/verify-email", "/newsletter/confirm", "/newsletter/unsubscribe")
$workspacePages = @("/dashboard/home", "/dashboard/bookings", "/dashboard/bookings/new", "/dashboard/customers", "/dashboard/trips", "/dashboard/trips/new", "/dashboard/buses", "/dashboard/buses/new", "/dashboard/drivers", "/dashboard/drivers/new", "/dashboard/operators", "/dashboard/routes", "/dashboard/routes/new", "/dashboard/branches", "/dashboard/branches/new", "/dashboard/team", "/dashboard/team/new", "/dashboard/roles", "/dashboard/roles/new", "/dashboard/activity", "/dashboard/extra", "/dashboard/finance", "/dashboard/settings", "/dashboard/profile", "/dashboard/notifications", "/dashboard/seat-layout")
$pages = if ($Paths.Count) {$Paths} elseif ($PublicOnly) {$publicPages} else {$workspacePages}
$results = [System.Collections.Generic.List[object]]::new()
$records = [System.Collections.Generic.HashSet[string]]::new()
$probe = '(() => { const w=document.documentElement.clientWidth; const items=Array.from(document.querySelectorAll("main *, .landing *, .public-page *, .auth-main *, .onboarding-page *")).filter(e=>{ const r=e.getBoundingClientRect(); if(!r.width || r.right<=w+1 || r.left<0 || e.closest("aside, [hidden]"))return false; for(let p=e.parentElement;p && p!==document.body;p=p.parentElement){if(["auto","scroll","hidden","clip"].includes(getComputedStyle(p).overflowX))return false;} return true; }).slice(0,12).map(e=>({tag:e.tagName,cls:String(e.className).slice(0,100),right:Math.round(e.getBoundingClientRect().right)})); return {url:location.pathname,width:innerWidth,availableWidth:w,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>w+1,items,alerts:Array.from(document.querySelectorAll("[role=alert]")).map(e=>e.textContent.trim()).filter(Boolean),records:Array.from(document.querySelectorAll("a[href]")).map(e=>e.getAttribute("href")).filter(h=>/^\/dashboard\/(bookings|trips|buses|drivers|operators|routes|branches|team|customers|roles|stops|agencies)\/[^/]+$/.test(h) && !h.endsWith("/new"))}; })()'
function Inspect-Page([string]$path) {
  agent-browser --session $Session open "http://localhost:3000$path" | Out-Null
  agent-browser --session $Session wait 900 | Out-Null
  foreach ($width in @(320,390,768,1440)) {
    agent-browser --session $Session set viewport $width 900 | Out-Null
    $rawResult = agent-browser --session $Session eval $probe | Out-String
    if ($LASTEXITCODE -ne 0) { throw "Browser layout probe failed for $path at ${width}px: $rawResult" }
    $result = $rawResult | ConvertFrom-Json
    if (!$result) { throw "Browser layout probe returned no result for $path at ${width}px." }
    foreach($record in $result.records){[void]$records.Add($record)}
    $result.PSObject.Properties.Remove("records")
    $result | Add-Member -NotePropertyName requestedUrl -NotePropertyValue $path
    $result | Add-Member -NotePropertyName unexpectedRedirect -NotePropertyValue ($result.url -ne ($path -split "\?")[0] -and !($path -eq "/dashboard/extra" -and $result.url -in @("/dashboard/data", "/dashboard/privacy")))
    if (!$PublicOnly -and $result.url -like "/auth/*") { throw "Protected route $path redirected to login. Check session and API availability before rerunning; do not count the login page as a successful dashboard check." }
    $results.Add($result)
    Write-Output "$path $width overflow=$($result.overflow) alerts=$($result.alerts.Count)"
  }
  $results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Output -Encoding utf8
  if ($PauseSeconds -gt 0) { Start-Sleep -Seconds $PauseSeconds }
}
foreach($path in $pages){Inspect-Page $path}
if(!$PublicOnly -and !$Paths.Count) {
  foreach($prefix in @("bookings","trips","buses","drivers","operators","routes","branches","team","customers","roles","stops","agencies")) {
    $detail = $records | Where-Object {$_ -like "/dashboard/$prefix/*"} | Select-Object -First 1
    if($detail){Inspect-Page $detail; if($prefix -notin @("operators","customers")){Inspect-Page "$detail/edit"}}
  }
}

$failures = @($results | Where-Object {$_.overflow -or $_.unexpectedRedirect -or $_.alerts.Count -gt 0})
if ($failures.Count) { throw "$($failures.Count) layout checks failed. See $Output for details." }
