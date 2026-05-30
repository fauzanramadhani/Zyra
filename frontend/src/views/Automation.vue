<template>
  <div class="flex-grow p-3 sm:p-4 md:p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    <!-- ============================================================ -->
    <!-- TOAST NOTIFICATION -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast"
             :class="toast.type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-red-600 border-red-400'"
             class="fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-white text-sm font-medium max-w-sm">
          <CheckCircleIcon v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0" />
          <AlertTriangleIcon v-else class="w-5 h-5 flex-shrink-0" />
          <span class="flex-1">{{ toast.message }}</span>
          <button @click="toast = null" class="flex-shrink-0 opacity-70 hover:opacity-100 transition">
            <XIcon class="w-4 h-4" />
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- ============================================================ -->
    <!-- FIRST-TIME ONBOARDING BANNER -->
    <!-- ============================================================ -->
    <div v-if="showOnboarding && !loading && rules.length === 0" 
         class="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <ZapIcon class="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-bold text-slate-800 dark:text-white">Welcome to Automation</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Automations let you create <strong>when → then</strong> rules to handle repetitive tasks automatically. 
            When a trigger event happens (like an issue status change), Zyra runs your actions (like assigning a team member or sending a notification).
          </p>
          <div class="flex flex-wrap gap-2 mt-3">
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Trigger
            </span>
            <span class="text-slate-400 dark:text-slate-600 text-xs self-center">→</span>
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Conditions
            </span>
            <span class="text-slate-400 dark:text-slate-600 text-xs self-center">→</span>
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Actions
            </span>
          </div>
        </div>
        <button @click="showOnboarding = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
          <XIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- STATS BAR -->
    <!-- ============================================================ -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl p-4">
        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
          <LayersIcon class="w-3.5 h-3.5" /> Total Rules
        </div>
        <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.totalRules }}</div>
      </div>
      <div class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl p-4">
        <div class="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium mb-1">
          <PlayIcon class="w-3.5 h-3.5" /> Active
        </div>
        <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.activeRules }}</div>
      </div>
      <div class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl p-4">
        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
          <ActivityIcon class="w-3.5 h-3.5" /> Executions
        </div>
        <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ stats.totalExecutions }}</div>
      </div>
      <div class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl p-4">
        <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
          <CheckCircleIcon class="w-3.5 h-3.5" /> Success Rate
        </div>
        <div class="text-2xl font-bold" :class="stats.failureRate > 20 ? 'text-red-600' : 'text-emerald-600'">
          {{ 100 - stats.failureRate }}%
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- HEADER + ACTIONS -->
    <!-- ============================================================ -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-slate-800 dark:text-white">Automation Rules</h1>
        <button v-if="rules.length > 0"
                @click="showOnboarding = !showOnboarding"
                class="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
                title="Show quick-start guide">
          <HelpCircleIcon class="w-4 h-4" />
        </button>
      </div>
      <div class="flex items-center gap-2">
        <!-- Tab toggle -->
        <div class="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button @click="activeTab = 'rules'"
                  :class="activeTab === 'rules' ? 'bg-white dark:bg-zyra-gray-darkCard shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition">
            Rules
          </button>
          <button @click="activeTab = 'logs'"
                  :class="activeTab === 'logs' ? 'bg-white dark:bg-zyra-gray-darkCard shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition">
            Execution Log
          </button>
        </div>
        <button @click="openCreateModal"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition shadow-sm">
          <PlusIcon class="w-4 h-4" /> New Rule
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- LOADING STATE -->
    <!-- ============================================================ -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Loading automation rules...</p>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- EMPTY STATE (Rules Tab) -->
    <!-- ============================================================ -->
    <div v-else-if="activeTab === 'rules' && rules.length === 0"
         class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-2xl p-12 text-center">
      <div class="w-16 h-16 bg-orange-100 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <ZapIcon class="w-8 h-8 text-orange-500" />
      </div>
      <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-2">No Automation Rules Yet</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
        Create rules to automatically assign issues, change statuses, send notifications, and more — so your team can focus on building.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button @click="openCreateModal"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition shadow-sm">
          <PlusIcon class="w-4 h-4" /> Create Your First Rule
        </button>
        <button @click="showOnboarding = true"
                class="inline-flex items-center gap-2 px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition">
          <HelpCircleIcon class="w-4 h-4" /> How it works
        </button>
      </div>
      <!-- Quick templates -->
      <div class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl mx-auto">
        <button @click="applyTemplate('auto_assign')"
                class="text-left p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-orange-300 dark:hover:border-orange-700 transition group">
          <div class="flex items-center gap-2 mb-1">
            <UserPlusIcon class="w-4 h-4 text-blue-500" />
            <span class="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">Auto-Assign on Status</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Assign a team member when an issue moves to a column.</p>
        </button>
        <button @click="applyTemplate('notify_priority')"
                class="text-left p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-orange-300 dark:hover:border-orange-700 transition group">
          <div class="flex items-center gap-2 mb-1">
            <BellIcon class="w-4 h-4 text-amber-500" />
            <span class="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">Notify on High Priority</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Send a notification when a high-priority issue is created.</p>
        </button>
        <button @click="applyTemplate('move_done_sprint')"
                class="text-left p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-orange-300 dark:hover:border-orange-700 transition group">
          <div class="flex items-center gap-2 mb-1">
            <GitBranchIcon class="w-4 h-4 text-purple-500" />
            <span class="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">Move Done to Next Sprint</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">Move unfinished issues to the next sprint on completion.</p>
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- RULES LIST -->
    <!-- ============================================================ -->
    <div v-else-if="activeTab === 'rules'" class="space-y-3">
      <div v-for="rule in rules" :key="rule.id"
           class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl shadow-sm overflow-hidden group">
        <div class="p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <!-- Toggle -->
              <button @click="toggleRule(rule)"
                      :class="rule.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'"
                      class="relative w-9 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5"
                      title="Toggle rule on/off">
                <span :class="rule.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'"
                      class="absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform"></span>
              </button>
              <!-- Info -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ rule.name }}</h3>
                  <span v-if="rule.description" class="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline truncate">— {{ rule.description }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-md text-xs font-medium">
                    <ZapIcon class="w-3 h-3" /> {{ triggerLabel(rule.triggerType) }}
                  </span>
                  <span class="text-slate-300 dark:text-slate-600 text-xs">→</span>
                  <template v-for="(action, ai) in parsedActions(rule.actions)" :key="ai">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-md text-xs font-medium">
                      {{ actionLabel(action.type) }}
                    </span>
                    <span v-if="ai < parsedActions(rule.actions).length - 1" class="text-slate-300 dark:text-slate-600 text-xs">+</span>
                  </template>
                </div>
                <!-- Execution stats -->
                <div class="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
                  <span class="inline-flex items-center gap-1" title="Total executions">
                    <ActivityIcon class="w-3 h-3" /> {{ rule.executionCount || 0 }} runs
                  </span>
                  <span v-if="rule.lastTriggeredAt" class="inline-flex items-center gap-1" title="Last triggered">
                    <ClockIcon class="w-3 h-3" /> {{ formatDate(rule.lastTriggeredAt) }}
                  </span>
                </div>
              </div>
            </div>
            <!-- Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <button @click="openTestModal(rule)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                      title="Test this rule">
                <PlayIcon class="w-4 h-4" />
              </button>
              <button @click="editRule(rule)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition"
                      title="Edit rule">
                <PencilIcon class="w-4 h-4" />
              </button>
              <button @click="deleteRule(rule)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Delete rule">
                <Trash2Icon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <!-- Expand: last execution status -->
        <div v-if="rule.executions && rule.executions.length > 0"
             class="border-t border-slate-100 dark:border-slate-800 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30">
          <div class="flex items-center gap-2 text-xs">
            <span class="text-slate-400 dark:text-slate-500">Last run:</span>
            <span :class="rule.executions[0].status === 'success' ? 'text-emerald-600' : rule.executions[0].status === 'failed' ? 'text-red-600' : 'text-slate-500'"
                  class="font-medium">
              {{ rule.executions[0].status }}
            </span>
            <span class="text-slate-400 dark:text-slate-500">
              — {{ formatDate(rule.executions[0].startedAt) }}
              <span v-if="rule.executions[0].duration"> ({{ rule.executions[0].duration }}ms)</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- EXECUTION LOG TAB -->
    <!-- ============================================================ -->
    <div v-else-if="activeTab === 'logs'" class="space-y-3">
      <div v-if="logsLoading" class="flex items-center justify-center py-20">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <div v-else-if="executions.length === 0"
           class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-2xl p-12 text-center">
        <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <HistoryIcon class="w-8 h-8 text-slate-400" />
        </div>
        <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-2">No Execution History</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          When your automation rules are triggered, their execution history will appear here. Create a rule and trigger an event to see results.
        </p>
      </div>
      <div v-for="exec in executions" :key="exec.id"
           class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl p-4 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3 min-w-0">
            <div :class="exec.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600' : exec.status === 'failed' ? 'bg-red-100 dark:bg-red-950/50 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'"
                 class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircleIcon v-if="exec.status === 'success'" class="w-4 h-4" />
              <AlertTriangleIcon v-else-if="exec.status === 'failed'" class="w-4 h-4" />
              <ClockIcon v-else class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-bold text-slate-800 dark:text-white">{{ exec.rule?.name || 'Unknown Rule' }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-md font-medium"
                      :class="exec.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' : exec.status === 'failed' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'">
                  {{ exec.status }}
                </span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Trigger: {{ triggerLabel(exec.triggerEvent) }}
                <span v-if="exec.duration"> · {{ exec.duration }}ms</span>
              </div>
              <div v-if="exec.errorMessage" class="text-xs text-red-600 dark:text-red-400 mt-1 truncate">{{ exec.errorMessage }}</div>
            </div>
          </div>
          <span class="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{{ formatDate(exec.startedAt) }}</span>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- CREATE / EDIT MODAL -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-8 px-4 overflow-y-auto" @click.self="closeModal">
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-zyra-gray-darkBorder">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white">
              {{ editingRule ? 'Edit Automation Rule' : 'Create Automation Rule' }}
            </h2>
            <button @click="closeModal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <XIcon class="w-5 h-5" />
            </button>
          </div>
          <!-- Modal body -->
          <div class="px-6 py-5 space-y-5">
            <!-- Rule Name -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Rule Name <span class="text-red-500">*</span>
              </label>
              <input v-model="form.name" type="text"
                     class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none"
                     placeholder="e.g. Auto-assign reviewer when moved to In Review" />
              <p v-if="formError" class="text-xs text-red-500 mt-1">{{ formError }}</p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description
                <span class="text-slate-400 dark:text-slate-500 font-normal text-xs ml-1">(optional)</span>
              </label>
              <input v-model="form.description" type="text"
                     class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none"
                     placeholder="Brief description of what this rule does" />
            </div>

            <!-- ===== WHEN SECTION ===== -->
            <div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-6 h-6 bg-green-100 dark:bg-green-950/50 rounded-lg flex items-center justify-center">
                  <PlayIcon class="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span class="text-sm font-bold text-slate-700 dark:text-slate-200">When this happens</span>
              </div>
              <div class="grid sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Trigger Event</label>
                  <SelectDropdown v-model="form.triggerType" :options="triggerOptions" placeholder="Select event..." />
                </div>
                <!-- Trigger config for status change -->
                <div v-if="form.triggerType === 'issue_status_changed'">
                  <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">To Status</label>
                  <SelectDropdown v-model="form.triggerConfig.toStatusId"
                                  :options="statusOptions"
                                  placeholder="Any status" />
                  <span class="text-sm font-bold text-slate-700 dark:text-slate-200">If these conditions match</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500 dark:text-slate-400">Logic:</span>
                  <button @click="form.conditionLogic = form.conditionLogic === 'AND' ? 'OR' : 'AND'"
                          :class="form.conditionLogic === 'AND' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'"
                          class="px-2 py-0.5 rounded-md text-xs font-bold transition">
                    {{ form.conditionLogic }}
                  </button>
                </div>
              </div>
              <div v-if="form.conditions.length === 0" class="text-center py-4">
                <p class="text-xs text-slate-400 dark:text-slate-500 mb-2">No conditions — the rule will always run when triggered</p>
                <button @click="addCondition"
                        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition">
                  <PlusIcon class="w-3 h-3" /> Add Condition
                </button>
              </div>
              <div v-else class="space-y-2">
                <div v-for="(cond, i) in form.conditions" :key="i"
                     class="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                  <div class="flex-1 min-w-0">
                    <SelectDropdown v-model="cond.field" :options="conditionFieldOptions" placeholder="Field" />
                  </div>
                  <div class="w-28">
                    <SelectDropdown v-model="cond.operator" :options="conditionOperatorOptions" placeholder="op" />
                  </div>
                  <input v-if="!['is_empty','is_not_empty'].includes(cond.operator)" v-model="cond.value" type="text"
                         class="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs w-32 outline-none"
                         placeholder="Value" />
                  <button @click="removeCondition(i)"
                          class="p-1 text-slate-400 hover:text-red-500 flex-shrink-0 transition"
                          title="Remove condition">
                    <XIcon class="w-3.5 h-3.5" />
                  </button>
                </div>
                <button @click="addCondition"
                        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition">
                  <PlusIcon class="w-3 h-3" /> Add Condition
                </button>
              </div>
            </div>

            <!-- ===== THEN SECTION (Actions) ===== -->
            <div class="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-6 h-6 bg-purple-100 dark:bg-purple-950/50 rounded-lg flex items-center justify-center">
                  <GitBranchIcon class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Then do these actions</span>
              </div>
              <div v-if="form.actions.length === 0" class="text-center py-4">
                <p class="text-xs text-slate-400 dark:text-slate-500 mb-2">Add at least one action</p>
                <button @click="addAction"
                        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition">
                  <PlusIcon class="w-3 h-3" /> Add Action
                </button>
              </div>
              <div v-else class="space-y-2">
                <div v-for="(action, i) in form.actions" :key="i"
                     class="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <div class="flex items-start gap-2">
                    <div class="flex-1 min-w-0 mb-2">
                      <SelectDropdown v-model="action.type" :options="actionTypeOptions" placeholder="Select action..." />
                    </div>
                    <button @click="removeAction(i)"
                            class="p-1 text-slate-400 hover:text-red-500 flex-shrink-0 transition"
                            title="Remove action">
                      <XIcon class="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <!-- Action params -->
                  <div class="grid grid-cols-2 gap-2">
                    <template v-if="action.type === 'change_status'">
                      <SelectDropdown v-model="action.params.statusId"
                                      :options="statusOptions"
                                      placeholder="Select status..." />
                    </template>
                    <template v-else-if="action.type === 'assign_user'">
                      <div class="col-span-2">
                        <SelectDropdown v-model="action.params.userId"
                                        :options="memberOptions"
                                        placeholder="Select user..."
                                        empty-text="No project members found" />
                      </div>
                    </template>
                    <template v-else-if="action.type === 'set_priority'">
                      <div class="col-span-2">
                        <SelectDropdown v-model="action.params.priority"
                                        :options="priorityOptions"
                                        placeholder="Select priority..." />
                      </div>
                    </template>
                    <template v-else-if="action.type === 'add_label' || action.type === 'remove_label'">
                      <input v-model="action.params.labelName" type="text" placeholder="Label name"
                             class="col-span-2 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none" />
                    </template>
                    <template v-else-if="action.type === 'add_comment'">
                      <input v-model="action.params.body" type="text" placeholder="Comment text"
                             class="col-span-2 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none" />
                    </template>
                    <template v-else-if="action.type === 'send_notification'">
                      <input v-model="action.params.title" type="text" placeholder="Notification title"
                             class="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none" />
                      <input v-model="action.params.message" type="text" placeholder="Notification body"
                             class="px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none" />
                    </template>
                    <template v-else-if="action.type === 'move_sprint'">
                      <div class="col-span-2">
                        <SelectDropdown v-model="action.params.sprintId"
                                        :options="sprintOptions"
                                        placeholder="Select sprint..." />
                      </div>
                    </template>
                    <template v-else-if="action.type === 'set_story_points'">
                      <input v-model.number="action.params.points" type="number" placeholder="Story points"
                             class="col-span-2 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none" />
                    </template>
                    <template v-else-if="action.type === 'create_subtask'">
                      <input v-model="action.params.title" type="text" placeholder="Subtask title"
                             class="col-span-2 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs outline-none" />
                    </template>
                  </div>
                </div>
                <button @click="addAction"
                        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition">
                  <PlusIcon class="w-3 h-3" /> Add Action
                </button>
              </div>
            </div>
          </div>
          <!-- Modal footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-b-2xl">
            <button v-if="editingRule" @click="deleteRule(editingRule)"
                    class="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition">
              Delete Rule
            </button>
            <span v-else></span>
            <div class="flex items-center gap-3">
              <button @click="closeModal"
                      class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">
                Cancel
              </button>
              <button @click="saveRule"
                      class="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition shadow-sm">
                {{ editingRule ? 'Save Changes' : 'Create Rule' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ============================================================ -->
    <!-- TEST / DRY-RUN MODAL -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <div v-if="showTestModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="closeTestModal">
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-zyra-gray-darkBorder p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-slate-800 dark:text-white">Test Rule: {{ testRuleObj?.name }}</h3>
            <button @click="closeTestModal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
              <XIcon class="w-5 h-5" />
            </button>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
            This simulates the rule without actually running any actions. Enter test values to see which conditions pass.
          </p>
          <div class="space-y-3 mb-4">
            <div>
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Issue Type</label>
              <input v-model="testContext.issueType" type="text" class="w-full px-3 py-2 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-lg bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="e.g. BUG" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
              <SelectDropdown v-model="testContext.issuePriority" :options="priorityOptions" placeholder="--" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status Name</label>
              <input v-model="testContext.issueStatusName" type="text" class="w-full px-3 py-2 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-lg bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="e.g. In Review" />
            </div>
          </div>
          <div v-if="testResult" class="mb-4 p-3 rounded-xl text-sm"
               :class="testResult.conditionsMet ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'">
            <p class="font-bold mb-2">{{ testResult.conditionsMet ? '✓ All conditions met — actions would run' : '✗ Conditions not met — actions would be skipped' }}</p>
            <div v-for="(cr, i) in testResult.conditionResults" :key="i" class="flex items-center gap-2 text-xs mt-1">
              <CheckCircleIcon v-if="cr.result" class="w-3.5 h-3.5 text-emerald-500" />
              <XIcon v-else class="w-3.5 h-3.5 text-red-500" />
              {{ cr.field }} {{ cr.operator }} {{ cr.value }}
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button @click="closeTestModal"
                    class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">
              Close
            </button>
            <button @click="runTest"
                    :disabled="testRunning"
                    class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50">
              {{ testRunning ? 'Testing...' : 'Run Test' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ============================================================ -->
    <!-- DELETE CONFIRMATION -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="showDeleteConfirm = false">
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-zyra-gray-darkBorder p-6">
          <div class="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangleIcon class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Delete Rule?</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Are you sure you want to delete <strong>"{{ deleteTarget?.name }}"</strong>?
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-500 mb-6">
            This action cannot be undone. The rule will be soft-deleted and can be recovered later.
          </p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteConfirm = false"
                    class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">
              Cancel
            </button>
            <button @click="confirmDelete"
                    class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition shadow-sm">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import { useProjectStore } from '../store/project';
import { socket } from '../services/socket';
import {
  Zap as ZapIcon,
  Play as PlayIcon,
  Plus as PlusIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  X as XIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as AlertTriangleIcon,
  Clock as ClockIcon,
  Layers as LayersIcon,
  Activity as ActivityIcon,
  Bell as BellIcon,
  UserPlus as UserPlusIcon,
  GitBranch as GitBranchIcon,
  Filter as FilterIcon,
  HelpCircle as HelpCircleIcon,
  History as HistoryIcon,
} from 'lucide-vue-next';
import SelectDropdown from '../components/SelectDropdown.vue';

const route = useRoute();
const projectStore = useProjectStore();
const projectId = computed(() => route.params.projectId as string);

// ============================================================
// STATE
// ============================================================
const rules = ref<any[]>([]);
const executions = ref<any[]>([]);
const loading = ref(true);
const logsLoading = ref(false);
const activeTab = ref<'rules' | 'logs'>('rules');
const showOnboarding = ref(true);

const stats = ref({
  totalRules: 0,
  activeRules: 0,
  totalExecutions: 0,
  failureRate: 0,
});

// Modal state
const showModal = ref(false);
const editingRule = ref<any>(null);
const formError = ref('');
const form = ref({
  name: '',
  description: '',
  triggerType: 'issue_created',
  triggerConfig: {} as Record<string, any>,
  conditions: [] as { field: string; operator: string; value: string }[],
  conditionLogic: 'AND',
  actions: [] as { type: string; params: Record<string, any> }[],
});

// Test modal state
const showTestModal = ref(false);
const testRuleObj = ref<any>(null);
const testRunning = ref(false);
const testResult = ref<any>(null);
const testContext = ref({
  issueType: '',
  issuePriority: '',
  issueStatusName: '',
});

// Delete confirmation
const showDeleteConfirm = ref(false);
const deleteTarget = ref<any>(null);

// Toast notifications
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { message, type };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = null; }, 3500);
}

// ============================================================
// COMPUTED
// ============================================================
const boardColumns = computed(() => projectStore.currentBoard?.columns || []);
const projectSprints = computed(() => projectStore.sprints || []);

// Dropdown option arrays (reactive, dark-mode compatible)
const triggerOptions = [
  { value: 'issue_created', label: 'Issue Created' },
  { value: 'issue_updated', label: 'Issue Updated' },
  { value: 'issue_status_changed', label: 'Status Changed' },
  { value: 'issue_assigned', label: 'Issue Assigned' },
  { value: 'issue_priority_changed', label: 'Priority Changed' },
  { value: 'issue_deleted', label: 'Issue Deleted' },
  { value: 'sprint_started', label: 'Sprint Started' },
  { value: 'sprint_completed', label: 'Sprint Completed' },
  { value: 'sprint_created', label: 'Sprint Created' },
];

const statusOptions = computed(() => {
  const cols = boardColumns.value.map((c: any) => ({ value: c.id, label: c.name }));
  return cols;
});

const conditionFieldOptions = [
  { value: 'issue_type', label: 'Type' },
  { value: 'priority', label: 'Priority' },
  { value: 'status_name', label: 'Status Name' },
  { value: 'assignee_id', label: 'Assignee' },
  { value: 'story_points', label: 'Story Points' },
  { value: 'summary', label: 'Summary' },
];

const conditionOperatorOptions = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const actionTypeOptions = [
  { value: 'change_status', label: 'Change Status' },
  { value: 'assign_user', label: 'Assign User' },
  { value: 'unassign_user', label: 'Unassign User' },
  { value: 'add_label', label: 'Add Label' },
  { value: 'remove_label', label: 'Remove Label' },
  { value: 'add_comment', label: 'Add Comment' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'move_sprint', label: 'Move to Sprint' },
  { value: 'set_priority', label: 'Set Priority' },
  { value: 'set_story_points', label: 'Set Story Points' },
  { value: 'create_subtask', label: 'Create Subtask' },
  { value: 'archive_issue', label: 'Archive Issue' },
];

const memberOptions = computed(() => {
  const members = projectStore.currentProject?.members || [];
  return members.map((m: any) => ({
    value: m.user?.id || m.id,
    label: m.user ? `${m.user.firstName} ${m.user.lastName}` : m.firstName ? `${m.firstName} ${m.lastName}` : m.email || m.id,
  }));
});

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const sprintOptions = computed(() =>
  projectSprints.value.map((s: any) => ({ value: s.id, label: s.name }))
);

// ============================================================
// METHODS
// ============================================================
function parsedActions(actions: any) {
  if (typeof actions === 'string') {
    try { return JSON.parse(actions); } catch { return []; }
  }
  return Array.isArray(actions) ? actions : [];
}

function triggerLabel(type: string) {
  const labels: Record<string, string> = {
    issue_created: 'Issue Created',
    issue_updated: 'Issue Updated',
    issue_status_changed: 'Status Changed',
    issue_assigned: 'Issue Assigned',
    issue_priority_changed: 'Priority Changed',
    issue_deleted: 'Issue Deleted',
    sprint_started: 'Sprint Started',
    sprint_completed: 'Sprint Completed',
    sprint_created: 'Sprint Created',
    comment_added: 'Comment Added',
  };
  return labels[type] || type;
}

function actionLabel(type: string) {
  const labels: Record<string, string> = {
    change_status: 'Change Status',
    assign_user: 'Assign User',
    unassign_user: 'Unassign',
    add_label: 'Add Label',
    remove_label: 'Remove Label',
    add_comment: 'Add Comment',
    send_notification: 'Notify',
    move_sprint: 'Move Sprint',
    set_priority: 'Set Priority',
    set_story_points: 'Set Story Points',
    create_subtask: 'Create Subtask',
    archive_issue: 'Archive Issue',
  };
  return labels[type] || type;
}

function formatDate(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function resetForm() {
  form.value = {
    name: '',
    description: '',
    triggerType: 'issue_created',
    triggerConfig: {},
    conditions: [],
    conditionLogic: 'AND',
    actions: [],
  };
  formError.value = '';
}

function addCondition() {
  form.value.conditions.push({ field: 'issue_type', operator: 'equals', value: '' });
}

function removeCondition(i: number) {
  form.value.conditions.splice(i, 1);
}

function addAction() {
  form.value.actions.push({ type: 'change_status', params: {} });
}

function removeAction(i: number) {
  form.value.actions.splice(i, 1);
}

// ============================================================
// API CALLS
// ============================================================
async function fetchRules() {
  loading.value = true;
  try {
    const res = await api.get(`/projects/${projectId.value}/automations`);
    rules.value = res.data.data || [];
    stats.value.totalRules = rules.value.length;
    stats.value.activeRules = rules.value.filter((r: any) => r.enabled).length;
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Failed to load rules', 'error');
  }
  loading.value = false;
}

async function fetchStats() {
  try {
    const res = await api.get(`/projects/${projectId.value}/automations/stats`);
    const d = res.data.data;
    if (d) {
      stats.value.totalExecutions = d.totalExecutions || 0;
      stats.value.failureRate = d.failureRate || 0;
    }
  } catch { /* stats are non-critical */ }
}

async function fetchExecutions() {
  logsLoading.value = true;
  try {
    const res = await api.get(`/projects/${projectId.value}/automations/executions`, { params: { limit: 50 } });
    executions.value = res.data.data || [];
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Failed to load execution logs', 'error');
  }
  logsLoading.value = false;
}

async function saveRule() {
  if (!form.value.name.trim()) {
    formError.value = 'Rule name is required.';
    return;
  }
  if (form.value.actions.length === 0) {
    formError.value = 'Add at least one action.';
    return;
  }
  formError.value = '';
  try {
    const payload = {
      name: form.value.name,
      description: form.value.description || undefined,
      triggerType: form.value.triggerType,
      triggerConfig: form.value.triggerConfig,
      conditions: form.value.conditions,
      conditionLogic: form.value.conditionLogic,
      actions: form.value.actions,
    };
    if (editingRule.value) {
      await api.patch(`/automations/${editingRule.value.id}`, payload);
      showToast('Rule updated successfully', 'success');
    } else {
      await api.post(`/projects/${projectId.value}/automations`, payload);
      showToast('Rule created successfully', 'success');
    }
    closeModal();
    await Promise.all([fetchRules(), fetchStats()]);
  } catch (err: any) {
    const msg = err?.response?.data?.error || 'Failed to save rule';
    formError.value = msg;
    showToast(msg, 'error');
  }
}

function editRule(rule: any) {
  editingRule.value = rule;
  const tc = typeof rule.triggerConfig === 'string' ? JSON.parse(rule.triggerConfig) : (rule.triggerConfig || {});
  const conds = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : (rule.conditions || []);
  const acts = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : (rule.actions || []);
  form.value = {
    name: rule.name,
    description: rule.description || '',
    triggerType: rule.triggerType,
    triggerConfig: tc,
    conditions: conds,
    conditionLogic: rule.conditionLogic || 'AND',
    actions: acts.map((a: any) => ({ type: a.type, params: a.params || {} })),
  };
  showModal.value = true;
}

function openCreateModal() {
  editingRule.value = null;
  resetForm();
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  editingRule.value = null;
  resetForm();
}

function deleteRule(rule: any) {
  deleteTarget.value = rule;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await api.delete(`/automations/${deleteTarget.value.id}`);
    showDeleteConfirm.value = false;
    showToast(`Rule "${deleteTarget.value.name}" deleted`, 'success');
    deleteTarget.value = null;
    if (showModal.value) closeModal();
    await Promise.all([fetchRules(), fetchStats()]);
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Failed to delete rule', 'error');
  }
}

async function toggleRule(rule: any) {
  try {
    await api.post(`/automations/${rule.id}/toggle`);
    const found = rules.value.find((r: any) => r.id === rule.id);
    if (found) found.enabled = !found.enabled;
    stats.value.activeRules = rules.value.filter((r: any) => r.enabled).length;
    showToast(rule.enabled ? `"${rule.name}" disabled` : `"${rule.name}" enabled`, 'success');
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Failed to toggle rule', 'error');
  }
}

async function openTestModal(rule: any) {
  testRuleObj.value = rule;
  testResult.value = null;
  testContext.value = { issueType: '', issuePriority: '', issueStatusName: '' };
  showTestModal.value = true;
}

function closeTestModal() {
  showTestModal.value = false;
  testRuleObj.value = null;
  testResult.value = null;
}

async function runTest() {
  if (!testRuleObj.value) return;
  testRunning.value = true;
  try {
    const res = await api.post(`/automations/${testRuleObj.value.id}/test`, {
      context: {
        projectId: projectId.value,
        issueType: testContext.value.issueType,
        issuePriority: testContext.value.issuePriority,
        issueStatusName: testContext.value.issueStatusName,
      },
    });
    testResult.value = res.data.data;
  } catch (err: any) {
    showToast(err?.response?.data?.error || 'Test failed', 'error');
  }
  testRunning.value = false;
}

function applyTemplate(template: string) {
  resetForm();
  if (template === 'auto_assign') {
    form.value.name = 'Auto-assign reviewer';
    form.value.triggerType = 'issue_status_changed';
    form.value.actions = [{ type: 'assign_user', params: {} }];
  } else if (template === 'notify_priority') {
    form.value.name = 'Notify on high priority';
    form.value.triggerType = 'issue_created';
    form.value.conditions = [{ field: 'priority', operator: 'equals', value: 'HIGH' }];
    form.value.actions = [{ type: 'send_notification', params: { title: 'High Priority Issue', message: 'A new high-priority issue was created.' } }];
  } else if (template === 'move_done_sprint') {
    form.value.name = 'Move unfinished to next sprint';
    form.value.triggerType = 'sprint_completed';
    form.value.actions = [{ type: 'move_sprint', params: {} }];
  }
  showModal.value = true;
}

// ============================================================
// SOCKET.IO REALTIME
// ============================================================
function setupSocket() {
  if (!socket) return;
  socket.on('automation:created', () => { fetchRules(); fetchStats(); });
  socket.on('automation:updated', () => { fetchRules(); });
  socket.on('automation:deleted', () => { fetchRules(); fetchStats(); });
  socket.on('automation:toggled', () => { fetchRules(); fetchStats(); });
  socket.on('automation:queued', () => { fetchExecutions(); });
}

// ============================================================
// LIFECYCLE
// ============================================================
onMounted(async () => {
  await Promise.all([
    fetchRules(),
    fetchStats(),
    projectStore.fetchSprints(projectId.value),
    projectStore.fetchProjectDetails(projectId.value),
  ]);
  setupSocket();
});

watch(activeTab, (tab) => {
  if (tab === 'logs') fetchExecutions();
});
</script>

<style scoped>
/* Toast transition */
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(1rem); }
.toast-leave-to { opacity: 0; transform: translateX(1rem); }
</style>

