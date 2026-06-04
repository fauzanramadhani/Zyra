<template>
  <div class="p-6 max-w-7xl w-full mx-auto text-slate-800 dark:text-slate-200">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          Email Webhook Gateway
          <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
            <HelpCircleIcon class="w-5 h-5" />
          </button>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatically convert inbound parsed emails into project issues</p>
      </div>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition flex items-center gap-2">
        <PlusIcon class="w-4 h-4" />
        New Gateway
      </button>
    </div>

    <!-- Glassmorphic Help Card -->
    <div v-if="showHelp" class="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-transparent dark:from-orange-950/20 dark:via-slate-800/40 dark:to-transparent border border-orange-200/50 dark:border-orange-500/10 shadow-sm backdrop-blur-sm relative transition duration-300">
      <button @click="showHelp = false" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
        <XIcon class="w-4 h-4" />
      </button>
      <div class="flex items-start gap-3.5">
        <div class="w-9 h-9 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
          <HelpCircleIcon class="w-5 h-5" />
        </div>
        <div class="flex-1 min-w-0 pr-4">
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Inbound Webhook Gateway — API Reference</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Zyra exposes a public webhook endpoint that accepts structured email payloads and automatically creates issues in your project. No authentication is required — the inbox ID in the URL acts as the secret key.
          </p>

          <!-- Endpoint -->
          <div class="mt-4 space-y-4">
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Endpoint</h4>
              <div class="bg-slate-900 dark:bg-black/50 rounded-xl p-3 overflow-x-auto">
                <code class="text-xs text-emerald-400 font-mono break-all">POST /api/email-inboxes/<span class="text-orange-400">{inboxId}</span>/incoming</code>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-500 mt-1.5">Copy the full webhook URL from any gateway card above. The URL includes your unique inbox ID.</p>
            </div>

            <!-- Authentication -->
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Authentication</h4>
              <div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-500/10 rounded-xl p-3">
                <p class="text-xs text-emerald-700 dark:text-emerald-400">No authentication required — this is a <strong>public webhook endpoint</strong>. The inbox ID serves as a secret token. Keep your webhook URL private.</p>
              </div>
            </div>

            <!-- HTTP Method & Headers -->
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Method & Headers</h4>
              <div class="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-700">
                      <th class="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Header</th>
                      <th class="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Value</th>
                      <th class="text-left py-1.5 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">Content-Type</td>
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">application/json</td>
                      <td class="py-1.5"><span class="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded text-[10px] font-bold">YES</span></td>
                    </tr>
                    <tr>
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">Accept</td>
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">application/json</td>
                      <td class="py-1.5"><span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold">No</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Request Body -->
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Request Body <span class="text-[10px] font-normal normal-case">(application/json)</span></h4>
              <div class="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 overflow-x-auto">
                <table class="w-full text-xs mb-2">
                  <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-700">
                      <th class="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Field</th>
                      <th class="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Type</th>
                      <th class="text-left py-1.5 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">fromEmail</td>
                      <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">string</td>
                      <td class="py-1.5"><span class="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded text-[10px] font-bold">YES</span></td>
                    </tr>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">subject</td>
                      <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">string</td>
                      <td class="py-1.5"><span class="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded text-[10px] font-bold">RECOMMENDED</span></td>
                    </tr>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">body</td>
                      <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">string (HTML)</td>
                      <td class="py-1.5"><span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold">No</span></td>
                    </tr>
                    <tr>
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">fromName</td>
                      <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">string</td>
                      <td class="py-1.5"><span class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold">No</span></td>
                    </tr>
                  </tbody>
                </table>

                <p class="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Example Payload</p>
                <pre class="bg-slate-900 dark:bg-black/60 rounded-lg p-3 overflow-x-auto"><code class="text-xs text-slate-300 font-mono">{
  "fromEmail": "user@example.com",
  "fromName": "Jane Doe",
  "subject": "Login page broken on Safari",
  "body": "&lt;p&gt;Users cannot log in using Safari 17.4.&lt;/p&gt;"
}</code></pre>
              </div>
            </div>

            <!-- Behavior -->
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Issue Creation Behavior</h4>
              <div class="bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-slate-200 dark:border-slate-700">
                      <th class="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Issue Field</th>
                      <th class="text-left py-1.5 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Mapped From</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">summary</td>
                      <td class="py-1.5 text-slate-500 dark:text-slate-400"><code class="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">subject</code> field (falls back to "Email Issue")</td>
                    </tr>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">description</td>
                      <td class="py-1.5 text-slate-500 dark:text-slate-400"><code class="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">fromName</code> + <code class="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">body</code> as HTML</td>
                    </tr>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">type</td>
                      <td class="py-1.5 text-slate-500 dark:text-slate-400">Gateway's <strong>Default Type</strong> preset</td>
                    </tr>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">priority</td>
                      <td class="py-1.5 text-slate-500 dark:text-slate-400">Gateway's <strong>Default Priority</strong> preset</td>
                    </tr>
                    <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">status</td>
                      <td class="py-1.5 text-slate-500 dark:text-slate-400">First column of the project's board (e.g. "To Do")</td>
                    </tr>
                    <tr>
                      <td class="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">key</td>
                      <td class="py-1.5 text-slate-500 dark:text-slate-400">Auto-generated (e.g. <code class="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">PROJ-42</code>)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Responses -->
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Success Response <span class="text-[10px] font-normal normal-case text-slate-400">HTTP 201</span></h4>
              <pre class="bg-slate-900 dark:bg-black/60 rounded-lg p-3 overflow-x-auto"><code class="text-xs text-slate-300 font-mono">{
  "success": true,
  "data": {
    "email": {
      "id": "a1b2c3d4-...",
      "status": "PROCESSED"
    },
    "issue": {
      "key": "PROJ-42",
      "id": "e5f6g7h8-..."
    }
  }
}</code></pre>
            </div>

            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Error Responses</h4>
              <div class="space-y-2">
                <div class="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-500/10 rounded-xl p-2.5">
                  <p class="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1">404 — Inbox not found or disabled</p>
                  <pre class="bg-red-100/50 dark:bg-black/30 rounded p-1.5 overflow-x-auto"><code class="text-[10px] text-red-700 dark:text-red-300 font-mono">{ "success": false, "message": "Inbox not found or disabled" }</code></pre>
                </div>
                <div class="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-500/10 rounded-xl p-2.5">
                  <p class="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1">404 — Project or board misconfiguration</p>
                  <pre class="bg-red-100/50 dark:bg-black/30 rounded p-1.5 overflow-x-auto"><code class="text-[10px] text-red-700 dark:text-red-300 font-mono">{ "success": false, "message": "Project not found" }</code></pre>
                </div>
              </div>
            </div>

            <!-- cURL Example -->
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Test with cURL</h4>
              <div class="bg-slate-900 dark:bg-black/60 rounded-lg p-3 overflow-x-auto">
                <pre class="text-xs text-slate-300 font-mono leading-relaxed"><code>curl -X POST https://your-server.com/api/email-inboxes/<span class="text-orange-400">YOUR_INBOX_ID</span>/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "fromEmail": "bug-reporter@example.com",
    "fromName": "QA Bot",
    "subject": "Dashboard crashes on empty state",
    "body": "&lt;p&gt;Steps to reproduce:&lt;/p&gt;&lt;ol&gt;&lt;li&gt;Clear all widgets&lt;/li&gt;&lt;li&gt;Refresh page&lt;/li&gt;&lt;/ol&gt;"
  }'</code></pre>
              </div>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">The request returns <code class="text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded">HTTP 201</code> with the created issue key on success.</p>
            </div>

            <!-- Integrations -->
            <div>
              <h4 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Compatible Services</h4>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">SendGrid</span>
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">Mailgun</span>
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">AWS SES</span>
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">Cloudflare</span>
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">Postmark</span>
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">Zapier</span>
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">Make.com</span>
                <span class="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 text-center font-medium">Custom HTTP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <div v-else-if="inboxes.length" class="space-y-3">
      <div v-for="inbox in inboxes" :key="inbox.id" class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition duration-300">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3.5 flex-grow min-w-0">
            <div class="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 flex-shrink-0 mt-0.5">
              <MailIcon class="w-5 h-5" />
            </div>
            <div class="flex-grow min-w-0">
              <h3 class="font-bold text-slate-800 dark:text-white text-sm truncate">{{ inbox.emailAddress }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-1 items-center">
                <span>Default Presets:</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-300">{{ inbox.defaultType }}</span>
                <span class="text-slate-300 dark:text-slate-600">·</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-300">{{ inbox.defaultPriority }}</span>
              </p>

              <!-- Webhook URL Display -->
              <div class="mt-3.5 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2.5">
                <div class="min-w-0 flex-grow">
                  <p class="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-550">Inbound Webhook URL</p>
                  <p class="text-xs font-mono text-slate-600 dark:text-slate-300 truncate mt-0.5">{{ getWebhookUrl(inbox.id) }}</p>
                </div>
                <button @click="copyToClipboard(getWebhookUrl(inbox.id))" class="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-lg text-slate-500 dark:text-slate-300 hover:text-orange-500 dark:hover:text-orange-400 text-xs font-bold transition flex items-center gap-1 flex-shrink-0" title="Copy Webhook URL">
                  Copy URL
                </button>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span :class="inbox.enabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'" class="text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full">
              {{ inbox.enabled ? 'Active' : 'Inactive' }}
            </span>
            <button @click="deleteInbox(inbox.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-slate-400 hover:text-red-500 transition flex-shrink-0">
              <Trash2Icon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <MailIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-bold text-slate-750 dark:text-slate-200 mb-2">No email webhook gateways configured</h3>
      <p class="text-sm text-slate-400 max-w-md mx-auto mb-6">Create inbound webhook gateways to capture external parsed email payloads and generate tasks automatically</p>
      <button @click="openCreateModal" class="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition">Create First Gateway</button>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">New Webhook Gateway</h2>
          
          <div class="space-y-4 mb-5">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Project Mailbox Alias</label>
              <input v-model="form.emailAddress" placeholder="support@mycompany.com" type="email" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none dark:text-slate-100" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Default Type</label>
                <select v-model="form.defaultType" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="STORY">Story</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Default Priority</label>
                <select v-model="form.defaultPriority" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2.5">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
            <button @click="createInbox" :disabled="!form.emailAddress" class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition disabled:opacity-50">Create Gateway</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, Mail as MailIcon, HelpCircle as HelpCircleIcon, X as XIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'EmailInboxView',
  components: { PlusIcon, Trash2Icon, MailIcon, HelpCircleIcon, XIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const inboxes = ref<any[]>([]);
    const showModal = ref(false);
    const showHelp = ref(true);
    const form = ref({ emailAddress: '', defaultType: 'BUG', defaultPriority: 'MEDIUM' });

    const fetchInboxes = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/projects/${projectId.value}/email-inboxes`);
        inboxes.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const openCreateModal = () => { form.value = { emailAddress: '', defaultType: 'BUG', defaultPriority: 'MEDIUM' }; showModal.value = true; };

    const createInbox = async () => {
      try {
        await api.post(`/projects/${projectId.value}/email-inboxes`, {
          emailAddress: form.value.emailAddress,
          defaultType: form.value.defaultType,
          defaultPriority: form.value.defaultPriority,
        });
        toast.success('Gateway created successfully');
        showModal.value = false;
        await fetchInboxes();
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to create gateway';
        toast.error(msg);
      }
    };

    const deleteInbox = async (id: string) => {
      if (!confirm('Delete this gateway?')) return;
      try {
        await api.delete(`/email-inboxes/${id}`);
        toast.success('Gateway deleted successfully');
        await fetchInboxes();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete gateway');
      }
    };

    const getWebhookUrl = (inboxId: string) => {
      const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';
      return `${apiBase}/email-inboxes/${inboxId}/incoming`;
    };

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('Webhook URL copied to clipboard');
    };

    onMounted(fetchInboxes);

    return { loading, inboxes, showModal, showHelp, form, openCreateModal, createInbox, deleteInbox, getWebhookUrl, copyToClipboard };
  },
});
</script>
