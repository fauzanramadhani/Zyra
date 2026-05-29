$basePath = "c:\Fauzan\jira-local\frontend\src"
$files = Get-ChildItem -Path $basePath -Recurse -Filter "*.vue" | Select-Object -ExpandProperty FullName

foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $original = $content

    # === FORM INPUTS ===
    # Search input in Board
    $content = $content -replace 'class="w-full pl-9 pr-4 py-1\.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-zyra-primary focus:border-transparent bg-slate-50"', 'class="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:ring-1 focus:ring-zyra-primary focus:border-transparent bg-slate-50 dark:bg-slate-800 dark:text-slate-200"'

    # Select elements with bg-slate-50
    $content = $content -replace 'border border-gray-300 rounded-lg px-3 py-1\.5 text-sm bg-slate-50 outline-none', 'border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 dark:text-slate-200 outline-none'

    # Generic inputs with bg-white border-slate-300
    $content = $content -replace 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"', 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"'

    # Inputs in create modals
    $content = $content -replace 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-zyra-primary outline-none"', 'w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none"'

    # Textarea
    $content = $content -replace 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-zyra-primary outline-none"', 'w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none"'

    # Select with bg-white border-slate-300 (transfer ownership etc)
    $content = $content -replace 'px-3 py-1\.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"', 'px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"'

    # Select with bg-white for invite role
    $content = $content -replace 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"', 'w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"'

    if ($content -ne $original) { Set-Content $file $content -NoNewline; Write-Host "Updated inputs: $([System.IO.Path]::GetFileName($file))" }
}
Write-Host "`nPhase 1 (inputs) complete"
