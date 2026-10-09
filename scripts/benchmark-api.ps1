#Requires -Version 7.3
param(
  [string]$Session = "team-qa",
  [string]$ApiUrl = "http://localhost:4000",
  [int]$Samples = 3,
  [string]$Output = "api-benchmark.json"
)
$ErrorActionPreference = "Stop"
if ($Samples -lt 1 -or $Samples -gt 10) { throw "Samples must be between 1 and 10." }
$apiLiteral = $ApiUrl.TrimEnd('/') | ConvertTo-Json -Compress
$probe = @"
(async () => {
  const results = [];
  for (const path of ['/auth/me', '/bookings/summary', '/trips?limit=20', '/buses?limit=20', '/customers?limit=20', '/finance/reports', '/notifications']) {
    const timings = [];
    let bytes = 0;
    for (let i = 0; i < $Samples; i++) {
      const start = performance.now();
      const response = await fetch($apiLiteral + '/api' + path, { credentials: 'include' });
      const body = await response.arrayBuffer();
      if (!response.ok) throw Error(path + ': HTTP ' + response.status);
      bytes = body.byteLength;
      timings.push(Math.round(performance.now() - start));
    }
    const sorted = [...timings].sort((a, b) => a - b);
    results.push({ path, timings, medianMs: sorted[Math.floor(sorted.length / 2)], maxMs: sorted.at(-1), bytes });
  }
  return { measuredAt: new Date().toISOString(), samples: $Samples, results };
})()
"@
# Reuse an authenticated test browser. No passwords/cookies are written to the report.
$rawResult = agent-browser --session $Session eval $probe | Out-String
if ($LASTEXITCODE -ne 0) { throw "Benchmark failed: $rawResult" }
$result = $rawResult | ConvertFrom-Json
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Output -Encoding utf8
$result.results | Format-Table path, medianMs, maxMs, bytes
