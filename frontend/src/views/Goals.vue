<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0">
    <!-- Back Navigation for Workspace Dashboard -->
    <div v-if="!isProjectView" class="mb-4">
      <router-link to="/workspace" class="text-sm text-orange-500 font-bold hover:underline flex items-center gap-1">
        &larr; Back to Workspace List
      </router-link>
    </div>

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          {{ isProjectView ? 'Project Goals & OKRs' : 'Workspace Goals & OKRs' }}
          <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
            <HelpCircleIcon class="w-5 h-5" />
          </button>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {{ isProjectView ? 'Filtered view of goals linked to this project' : 'Primary dashboard for workspace-level objectives and key results' }}
        </p>
      </div>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
        <PlusIcon class="w-4 h-4" />
        New Goal
      </button>
    </div>
    </div>

    <div class="flex-grow overflow-y-auto min-h-0 pr-1">

    <!-- Help Card -->
    <div v-if="showHelp" class="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-transparent dark:from-orange-950/20 dark:via-slate-800/40 dark:to-transparent border border-orange-200/50 dark:border-orange-500/10 shadow-sm backdrop-blur-sm relative transition duration-300">
      <button @click="showHelp = false" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
        <XIcon class="w-4 h-4" />
      </button>
      <div class="flex items-start gap-3.5">
        <div class="w-9 h-9 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
          <HelpCircleIcon class="w-5 h-5" />
        </div>
        <div class="flex-grow min-w-0 pr-4">
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">🎯 Goals MVP Guide</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            OKRs consist of top-level **Objectives** which aggregate progress from child **Key Results**.
          </p>
          <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc">
            <li><strong>Objective Progress</strong>: Average progress of its child Key Results. Objectives cannot link directly to work.</li>
            <li><strong>Key Result Progress</strong>: Links to Projects or Epics to compute automatic completion averages, or managed manually.</li>
            <li><strong>Automatic Completion</strong>: When a goal hits 100% progress, its display status automatically updates to Completed.</li>
            <li><strong>Cycle Scope</strong>: Goals are organized by scoping cycles (format: YYYY-QN, e.g. 2026-Q2).</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Filter Bar for Workspace page -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Cycle Filter -->
        <input type="text" v-model="filterCycle" placeholder="Filter Cycle (e.g. 2026-Q2)" class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-orange-500" @input="fetchGoals" />
        
        <!-- Owner Filter -->
        <select v-model="filterOwner" class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-orange-500" @change="fetchGoals">
          <option value="">All Owners</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.firstName }} {{ m.lastName }}</option>
        </select>
      </div>

      <!-- Show Archived Toggle -->
      <label class="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 font-semibold select-none">
        <input type="checkbox" v-model="showArchived" @change="fetchGoals" class="text-orange-500 focus:ring-orange-500 rounded border-slate-300" />
        Include Archived Goals
      </label>
    </div>

    <!-- Goals List -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <div v-else-if="goals.length" class="space-y-4">
      <div v-for="goal in goals" :key="goal.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm relative" :class="{ 'opacity-60 bg-slate-50/50': goal.archivedAt }">
        <span v-if="goal.archivedAt" class="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-bold uppercase">Archived</span>
        
        <div class="flex items-start justify-between mb-3">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-slate-800 dark:text-white cursor-pointer hover:text-orange-500 transition" @click="openDetail(goal)">
                {{ goal.title }}
              </h3>
              <span class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500">
                {{ goal.type }}
              </span>
            </div>
            <p v-if="goal.description" class="text-xs text-slate-500 mt-1">{{ goal.description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-1 rounded-full font-semibold" :class="statusColor(goal.displayStatus)">{{ goal.displayStatus?.replace('_', ' ') }}</span>
            <button @click="deleteGoal(goal)" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete Goal">
              <Trash2Icon class="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mb-3">
          <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span class="font-semibold">{{ goal.progress || 0 }}%</span>
          </div>
          <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-orange-500 rounded-full transition-all" :style="{ width: `${goal.progress || 0}%` }"></div>
          </div>
        </div>

        <!-- Meta -->
        <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3">
          <span v-if="goal.cycle" class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-medium">{{ goal.cycle }}</span>
          <span v-if="goal.children?.length">{{ goal.children.length }} sub-goals</span>
          
          <!-- Owner Avatar -->
          <div class="flex items-center gap-1.5">
            <img :src="goal.owner?.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex'" class="w-4 h-4 rounded-full" />
            <span class="font-semibold">{{ goal.owner?.firstName }} {{ goal.owner?.lastName }}</span>
          </div>

          <button @click="openDetail(goal)" class="text-orange-500 hover:underline font-bold ml-auto">View Details & History →</button>
        </div>

        <!-- Children (Key Results) -->
        <div v-if="goal.children?.length" class="mt-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-3">
          <div v-for="child in goal.children" :key="child.id" class="space-y-1 relative" :class="{ 'opacity-65': child.archivedAt }">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:text-orange-500 transition" @click="openDetail(child)">{{ child.title }}</span>
                <span class="text-[9px] px-1 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">KR - {{ child.trackingMethod }}</span>
                <span v-if="child.archivedAt" class="text-[8px] px-1 bg-slate-200 text-slate-600 rounded uppercase">Archived</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-semibold" :class="child.displayStatus === 'COMPLETED' ? 'text-green-600' : 'text-slate-500'">{{ child.progress || 0 }}%</span>
                <button v-if="child.trackingMethod === 'MANUAL' && !child.archivedAt && quickUpdateId !== child.id" @click.stop="quickUpdateId = child.id; quickUpdateVal = child.currentValue; quickUpdateNote = ''" class="text-[10px] text-orange-500 font-bold hover:underline">
                  Update
                </button>
              </div>
            </div>
            <!-- Quick update form inline for child -->
            <div v-if="quickUpdateId === child.id" class="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-left space-y-2">
              <div class="flex items-center gap-2">
                <label class="text-[10px] text-slate-500 font-bold uppercase">Value:</label>
                <input type="number" v-model.number="quickUpdateVal" class="w-16 px-1.5 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white" />
                <span class="text-[10px] text-slate-400">/ {{ child.targetValue || 100 }} {{ child.unit || '' }}</span>
              </div>
              <input type="text" v-model="quickUpdateNote" placeholder="Catatan pembaruan..." class="w-full px-2 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-orange-500" />
              <div class="flex justify-end gap-1.5">
                <button @click.stop="quickUpdateId = null" class="px-2 py-0.5 text-[9px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition">Cancel</button>
                <button @click.stop="saveQuickUpdate(child.id)" class="px-2.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded hover:bg-orange-600 transition">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20">
      <TargetIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No goals found</h3>
      <p class="text-sm text-slate-400 mb-4">No objectives or key results match the current project context or filters.</p>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Create Goal</button>
    </div>

    </div>

    <!-- Goal Detail Drawer -->
    <Transition name="drawer">
      <div v-if="detailGoal" class="fixed inset-0 z-40 overflow-hidden flex justify-end">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" @click="detailGoal = null"></div>

        <div class="relative w-full max-w-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col h-full border-l border-slate-250 dark:border-slate-700 z-50">
          <!-- Header -->
          <div class="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-500/10 text-orange-500">{{ detailGoal.type }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold" :class="statusColor(detailGoal.displayStatus)">{{ detailGoal.displayStatus?.replace('_', ' ') }}</span>
                <span v-if="detailGoal.archivedAt" class="text-[9px] px-2 py-0.5 bg-red-100 text-red-600 rounded font-bold uppercase">Archived</span>
              </div>
              <h2 class="text-lg font-bold text-slate-850 dark:text-white">{{ detailGoal.title }}</h2>
            </div>
            <button @click="detailGoal = null" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition">
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Drawer Tabs -->
          <div class="flex border-b border-slate-200 dark:border-slate-700 px-6">
            <button @click="detailTab = 'overview'" :class="detailTab === 'overview' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-500'" class="py-3 px-4 border-b-2 font-bold text-sm transition outline-none">Overview</button>
            <button @click="detailTab = 'history'" :class="detailTab === 'history' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-500'" class="py-3 px-4 border-b-2 font-bold text-sm transition outline-none">Activity Log</button>
          </div>

          <!-- Body -->
          <div class="flex-grow overflow-y-auto p-6 space-y-6">
            <div v-if="detailTab === 'overview'" class="space-y-6">
              <!-- Archived Warning Banner -->
              <div v-if="detailGoal.archivedAt" class="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-200/50 dark:border-red-500/10 flex justify-between items-center">
                <p class="text-xs text-red-750 dark:text-red-300 font-semibold flex items-center gap-1.5">
                  <span>⚠️</span> Archived Goal is read-only. Unarchive to modify.
                </p>
                <button @click="unarchiveGoal(detailGoal.id)" class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition shadow">
                  Unarchive Goal
                </button>
              </div>

              <!-- Description -->
              <div>
                <h4 class="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Description</h4>
                <p class="text-sm text-slate-650 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{{ detailGoal.description || 'No description provided.' }}</p>
              </div>

              <!-- Health Status (Manual Management) -->
              <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <h4 class="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-3">Goal Health</h4>
                
                <div v-if="detailGoal.displayStatus === 'COMPLETED'" class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <span class="text-sm font-bold text-green-600 dark:text-green-400">Completed Automatically</span>
                </div>
                
                <div v-else-if="detailGoal.archivedAt" class="text-xs text-slate-500 italic">
                  Status is locked to read-only during archive.
                </div>
                
                <div v-else class="flex items-center gap-3">
                  <select :value="detailGoal.status" @change="updateGoalStatus(detailGoal.id, $event.target.value)" class="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-orange-500">
                    <option value="ON_TRACK">🟢 On Track</option>
                    <option value="AT_RISK">🟡 At Risk</option>
                    <option value="OFF_TRACK">🔴 Off Track</option>
                  </select>
                  <p class="text-[10px] text-slate-500">Manual health managed by Goal Owner.</p>
                </div>
              </div>

              <!-- Tracking Info & Archive action -->
              <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-4">
                <div>
                  <h4 class="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-3">Progress Tracking</h4>
                  <div class="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span class="text-slate-500">Owner:</span>
                      <span class="font-bold text-slate-800 dark:text-white ml-1.5">{{ detailGoal.owner?.firstName }} {{ detailGoal.owner?.lastName }}</span>
                    </div>
                    <div>
                      <span class="text-slate-500">Cycle:</span>
                      <span class="font-bold text-slate-800 dark:text-white ml-1.5">{{ detailGoal.cycle }}</span>
                    </div>
                    <div v-if="detailGoal.type === 'KEY_RESULT'">
                      <span class="text-slate-500">Method:</span>
                      <span class="font-bold text-slate-800 dark:text-white capitalize ml-1.5">{{ detailGoal.trackingMethod?.toLowerCase() }}</span>
                    </div>
                    <div v-if="detailGoal.type === 'KEY_RESULT' && detailGoal.trackingMethod === 'AUTOMATIC'">
                      <span class="text-slate-500">Source:</span>
                      <span class="font-bold text-slate-800 dark:text-white capitalize ml-1.5">{{ detailGoal.automaticSource?.toLowerCase() }}</span>
                    </div>
                  </div>

                  <div class="mt-4">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>Overall Progress</span>
                      <span>{{ detailGoal.progress || 0 }}%</span>
                    </div>
                    <div class="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full bg-orange-500 rounded-full transition-all duration-350" :style="{ width: `${detailGoal.progress || 0}%` }"></div>
                    </div>
                  </div>
                </div>

                <!-- Archive button -->
                <div v-if="!detailGoal.archivedAt" class="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-end">
                  <button @click="archiveGoal(detailGoal.id)" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-350 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition">
                    Archive Goal
                  </button>
                </div>
              </div>

              <!-- Last Updated Note -->
              <div v-if="detailGoal.history?.length && detailGoal.history[0]?.note" class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <h4 class="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Last Updated Note</h4>
                <p class="text-xs text-slate-650 dark:text-slate-355 italic">
                  "{{ detailGoal.history[0].note }}"
                </p>
                <p class="text-[10px] text-slate-400 mt-1">
                  Updated on {{ formatDate(detailGoal.history[0].createdAt) }}
                </p>
              </div>

              <!-- Linked items (Key Results only) -->
              <div v-if="detailGoal.type === 'KEY_RESULT'">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Linked Work Items</h4>
                  <button v-if="!detailGoal.archivedAt" @click="showLinkModal = true" class="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1">
                    <LinkIcon class="w-3.5 h-3.5" /> Link Item
                  </button>
                </div>
                <div v-if="detailGoal.linkedItems?.length" class="space-y-2">
                  <div v-for="link in detailGoal.linkedItems" :key="link.id" class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700 rounded-xl">
                    <div class="flex items-center gap-2">
                      <LayersIcon v-if="link.entityType === 'PROJECT'" class="w-4 h-4 text-blue-500" />
                      <TargetIcon v-else-if="link.entityType === 'EPIC'" class="w-4 h-4 text-purple-500" />
                      <span class="text-xs font-bold text-slate-500 uppercase">{{ link.entityType }}:</span>
                      <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ getLinkedEntityName(link) }}</span>
                      <!-- Individual Progress Badge -->
                      <span class="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded ml-1">{{ link.progress || 0 }}%</span>
                    </div>
                    <button v-if="!detailGoal.archivedAt" @click="unlinkEntity(link.id)" class="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded transition">
                      <Trash2Icon class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p v-else class="text-xs text-slate-500 italic text-center py-5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No linked items yet. Automatic goals require linked items to compute progress.</p>
              </div>

              <!-- Objectives cannot link directly -->
              <div v-else class="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                <p class="text-xs text-slate-500 italic">Objectives aggregate progress from child Key Results. Link Projects or Epics to Key Results instead.</p>
              </div>
            </div>

            <div v-else-if="detailTab === 'history'" class="space-y-6">
              <h4 class="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Progress Stream</h4>
              <div v-if="detailGoal.history?.length" class="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-6">
                <div v-for="log in detailGoal.history" :key="log.id" class="relative">
                  <div class="absolute -left-[32px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-orange-500 flex items-center justify-center">
                    <div class="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <img :src="log.changedBy?.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex'" class="w-5 h-5 rounded-full" />
                      <span class="text-xs font-bold text-slate-700 dark:text-slate-355">{{ log.changedBy?.firstName }} {{ log.changedBy?.lastName }}</span>
                      <span class="text-[10px] text-slate-400">{{ formatDate(log.createdAt) }}</span>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-400">
                      Progress updated to <span class="font-bold text-orange-500">{{ log.progress }}%</span> 
                    </p>
                    <p v-if="log.note" class="mt-1.5 text-xs bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-350 italic">
                      "{{ log.note }}"
                    </p>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-slate-500 italic text-center py-5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No updates logged yet.</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-xs" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto z-50">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">New Goal</h2>
          
          <form @submit.prevent="createGoal" class="space-y-3.5 mb-5">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Parent Objective (Optional)</label>
              <select v-model="form.parentId" @change="onParentChange" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                <option :value="null">None (Top-level Objective)</option>
                <!-- Only allow top-level goals with type OBJECTIVE as parent -->
                <option v-for="g in objectivesOnly" :key="g.id" :value="g.id">{{ g.title }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Goal Title</label>
              <input v-model="form.title" placeholder="Goal title" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-orange-500 outline-none dark:text-slate-100" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Description</label>
              <textarea v-model="form.description" placeholder="Description" rows="2" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-orange-500 outline-none dark:text-slate-100"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Goal Type</label>
                <select v-model="form.type" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100" :disabled="!!form.parentId">
                  <option value="OBJECTIVE">Objective</option>
                  <option value="KEY_RESULT">Key Result</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Scoping Cycle (YYYY-QN)</label>
                <input v-model="form.cycle" placeholder="e.g. 2026-Q2" required pattern="\d{4}-Q[1-4]" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-orange-500 outline-none dark:text-slate-100" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Goal Owner</label>
              <select v-model="form.ownerId" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                <option value="">Select owner...</option>
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.firstName }} {{ m.lastName }}</option>
              </select>
            </div>

            <!-- Tracking Method Selection (Key Results only) -->
            <div v-if="form.type === 'KEY_RESULT'" class="border-t border-slate-150 dark:border-slate-700 pt-3">
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Progress Tracking Method</label>
              <div class="flex gap-4 text-xs font-semibold mb-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="MANUAL" v-model="form.trackingMethod" class="text-orange-500 focus:ring-orange-500" />
                  Manual Entry
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="AUTOMATIC" v-model="form.trackingMethod" class="text-orange-500 focus:ring-orange-500" />
                  Automatic (via Linked Work)
                </label>
              </div>

              <!-- Manual Inputs -->
              <div v-if="form.trackingMethod === 'MANUAL'" class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Target</label>
                  <input v-model.number="form.targetValue" type="number" placeholder="Target" class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-orange-500 outline-none dark:text-slate-100" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Start Value</label>
                  <input v-model.number="form.currentValue" type="number" placeholder="Start" class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-orange-500 outline-none dark:text-slate-100" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Unit</label>
                  <input v-model="form.unit" placeholder="e.g. %, SP, items" class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-orange-500 outline-none dark:text-slate-100" />
                </div>
              </div>

              <!-- Automatic Configuration -->
              <div v-else class="grid grid-cols-1 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Sync Progress From</label>
                  <select v-model="form.automaticSource" class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none dark:text-slate-100">
                    <option value="PROJECT">Project Progress</option>
                    <option value="EPIC">Epic Resolution</option>
                  </select>
                </div>
                <div v-if="form.automaticSource === 'EPIC'">
                  <label class="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">Select Epic</label>
                  <select v-model="form.linkedEpicId" class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none dark:text-slate-100">
                    <option value="">Choose an Epic...</option>
                    <option v-for="e in epics" :key="e.id" :value="e.id">{{ e.key }} - {{ e.summary }}</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button type="button" @click="showModal = false" class="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
              <button type="submit" :disabled="!form.title || (form.type === 'KEY_RESULT' && form.trackingMethod === 'AUTOMATIC' && form.automaticSource === 'EPIC' && !form.linkedEpicId)" class="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition disabled:opacity-50 shadow-sm">Create</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Link Entity Modal -->
    <Teleport to="body">
      <div v-if="showLinkModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" @click="showLinkModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 z-50">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Link Work Item</h2>
          
          <div class="space-y-4 mb-5">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Link Entity Type</label>
              <select v-model="linkForm.entityType" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                <option value="PROJECT">Project</option>
                <option value="EPIC">Epic</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Select Item</label>
              <select v-if="linkForm.entityType === 'PROJECT'" v-model="linkForm.entityId" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                <option value="">Select project...</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} ({{ p.key }})</option>
              </select>
              
              <select v-else v-model="linkForm.entityId" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                <option value="">Select epic...</option>
                <option v-for="e in epics" :key="e.id" :value="e.id">{{ e.key }} - {{ e.summary }}</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2.5">
            <button @click="showLinkModal = false" class="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
            <button @click="submitLink" :disabled="!linkForm.entityId" class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition disabled:opacity-50">Link Item</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, Target as TargetIcon, HelpCircle as HelpCircleIcon, X as XIcon, Link as LinkIcon, Layers as LayersIcon, FileText as FileTextIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';
import { useAuthStore } from '../store/auth';

export default defineComponent({
  name: 'GoalsView',
  components: { PlusIcon, Trash2Icon, TargetIcon, HelpCircleIcon, XIcon, LinkIcon, LayersIcon, FileTextIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const authStore = useAuthStore();

    const isProjectView = computed(() => !!route.params.projectId);
    const projectId = computed(() => route.params.projectId as string);
    const workspaceId = computed(() => authStore.currentWorkspace?.id);

    const loading = ref(false);
    const showHelp = ref(true);
    const goals = ref<any[]>([]);
    const showModal = ref(false);
    
    // Filter properties
    const filterCycle = ref('');
    const filterOwner = ref('');
    const showArchived = ref(false);

    // Create goal form fields
    const form = ref({ 
      title: '', 
      description: '', 
      type: 'OBJECTIVE', 
      cycle: '2026-Q2', 
      targetValue: null as number | null, 
      currentValue: 0, 
      unit: '',
      trackingMethod: 'MANUAL',
      automaticSource: 'PROJECT',
      parentId: null as string | null,
      linkedEpicId: '',
      ownerId: ''
    });

    // Quick Update properties
    const quickUpdateId = ref<string | null>(null);
    const quickUpdateVal = ref<number>(0);
    const quickUpdateNote = ref<string>('');

    // Detail Drawer properties
    const detailGoal = ref<any>(null);
    const detailTab = ref<string>('overview');

    // Link entity state
    const showLinkModal = ref(false);
    const linkForm = ref({ entityType: 'PROJECT', entityId: '' });
    const epics = ref<any[]>([]);
    const projects = ref<any[]>([]);
    const members = ref<any[]>([]);

    const objectivesOnly = ref<any[]>([]);

    const fetchObjectivesOnly = async () => {
      if (!workspaceId.value) return;
      try {
        const { data } = await api.get(`/goals?workspaceId=${workspaceId.value}&includeArchived=false`);
        objectivesOnly.value = (data.data || []).filter((g: any) => g.type === 'OBJECTIVE');
      } catch { /* empty */ }
    };

    const fetchGoals = async () => {
      loading.value = true;
      try {
        let url = `/goals?includeArchived=${showArchived.value}`;
        if (isProjectView.value) {
          url += `&projectId=${projectId.value}`;
        } else if (workspaceId.value) {
          url += `&workspaceId=${workspaceId.value}`;
        }
        if (filterCycle.value) {
          url += `&cycle=${filterCycle.value}`;
        }
        if (filterOwner.value) {
          url += `&ownerId=${filterOwner.value}`;
        }

        const { data } = await api.get(url);
        goals.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const fetchMembers = async (wId: string) => {
      try {
        const res = await api.get(`/workspaces/${wId}/members`);
        members.value = res.data.data || [];
      } catch { /* empty */ }
    };

    const fetchLinkOptions = async () => {
      try {
        if (workspaceId.value) {
          const projRes = await api.get('/projects', { params: { workspaceId: workspaceId.value } });
          projects.value = projRes.data.data || [];
        }

        if (projectId.value) {
          const epicRes = await api.get(`/projects/${projectId.value}/issues?type=EPIC`);
          epics.value = epicRes.data.data || [];
        } else if (projects.value.length) {
          // If workspace dashboard, fetch epics of the first project as options or all projects
          const epicRes = await api.get(`/projects/${projects.value[0].id}/issues?type=EPIC`);
          epics.value = epicRes.data.data || [];
        }
      } catch (err) {
        console.error('Failed to load link options', err);
      }
    };

    const openCreateModal = () => { 
      form.value = { 
        title: '', 
        description: '', 
        type: 'OBJECTIVE', 
        cycle: '2026-Q2', 
        targetValue: null, 
        currentValue: 0, 
        unit: '',
        trackingMethod: 'MANUAL',
        automaticSource: 'PROJECT',
        parentId: null,
        linkedEpicId: '',
        ownerId: authStore.user?.id || ''
      }; 
      showModal.value = true; 
    };

    const onParentChange = () => {
      if (form.value.parentId) {
        form.value.type = 'KEY_RESULT';
      } else {
        form.value.type = 'OBJECTIVE';
      }
    };

    const createGoal = async () => {
      try {
        const cycleRegex = /^\d{4}-Q[1-4]$/;
        if (!cycleRegex.test(form.value.cycle)) {
          toast.error('Cycle must be in YYYY-QN format (e.g. 2026-Q2)');
          return;
        }

        const payload: any = { ...form.value };
        if (isProjectView.value) {
          payload.projectId = projectId.value;
        } else if (workspaceId.value) {
          payload.workspaceId = workspaceId.value;
        }

        await api.post('/goals', payload);
        toast.success('Goal created');
        showModal.value = false;
        await fetchGoals();
        await fetchObjectivesOnly();
      } catch (err: any) { 
        toast.error(err.response?.data?.message || 'Failed to create goal'); 
      }
    };

    const deleteGoal = async (goal: any) => {
      if (goal.type === 'OBJECTIVE') {
        const activeChildren = goal.children?.length || 0;
        if (activeChildren > 0) {
          toast.error('Objective still has child Key Results and cannot be deleted');
          return;
        }
      }

      if (!confirm('Delete this goal?')) return;
      try {
        await api.delete(`/goals/${goal.id}`);
        toast.success('Goal deleted');
        if (detailGoal.value?.id === goal.id) {
          detailGoal.value = null;
        }
        await fetchGoals();
      } catch (err: any) { 
        toast.error(err.response?.data?.message || 'Failed to delete goal'); 
      }
    };

    // Quick progress update
    const saveQuickUpdate = async (goalId: string) => {
      try {
        await api.post(`/goals/${goalId}/progress`, {
          currentValue: quickUpdateVal.value,
          note: quickUpdateNote.value
        });
        toast.success('Progress updated');
        quickUpdateId.value = null;
        await fetchGoals();
        if (detailGoal.value && detailGoal.value.id === goalId) {
          await openDetail(detailGoal.value); // refresh detail drawer
        }
      } catch (err: any) { 
        toast.error(err.response?.data?.message || 'Failed to update progress'); 
      }
    };

    // Open detail Drawer
    const openDetail = async (goal: any) => {
      try {
        const { data } = await api.get(`/goals/${goal.id}`);
        detailGoal.value = data.data;
        detailTab.value = 'overview';
      } catch {
        detailGoal.value = goal;
        detailTab.value = 'overview';
      }
    };

    // Link submit
    const submitLink = async () => {
      if (!detailGoal.value || !linkForm.value.entityId) return;

      // Overlap warning but not blocked
      let overlapDetected = false;
      if (linkForm.value.entityType === 'EPIC') {
        const selectedEpic = epics.value.find(e => e.id === linkForm.value.entityId);
        if (selectedEpic) {
          const isProjectLinked = detailGoal.value.linkedItems?.some(
            (link: any) => link.entityType === 'PROJECT' && link.entityId === selectedEpic.projectId
          );
          if (isProjectLinked) overlapDetected = true;
        }
      } else if (linkForm.value.entityType === 'PROJECT') {
        const linkedEpicsInProject = detailGoal.value.linkedItems?.some((link: any) => {
          if (link.entityType !== 'EPIC') return false;
          const epic = epics.value.find(e => e.id === link.entityId);
          return epic && epic.projectId === linkForm.value.entityId;
        });
        if (linkedEpicsInProject) overlapDetected = true;
      }

      if (overlapDetected) {
        const confirmLink = confirm('This Epic belongs to a Project already linked to this Goal. Progress may be counted twice. Do you want to continue?');
        if (!confirmLink) return;
      }

      try {
        await api.post(`/goals/${detailGoal.value.id}/links`, {
          entityType: linkForm.value.entityType,
          entityId: linkForm.value.entityId
        });
        toast.success('Work item linked successfully');
        showLinkModal.value = false;
        linkForm.value.entityId = '';
        await openDetail(detailGoal.value);
        await fetchGoals();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to link item');
      }
    };

    // Unlink submit
    const unlinkEntity = async (linkId: string) => {
      if (!detailGoal.value) return;
      if (!confirm('Remove this link?')) return;
      try {
        await api.delete(`/goals/${detailGoal.value.id}/links/${linkId}`);
        toast.success('Link removed');
        await openDetail(detailGoal.value);
        await fetchGoals();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to remove link');
      }
    };

    const updateGoalStatus = async (goalId: string, status: string) => {
      try {
        await api.patch(`/goals/${goalId}`, { status });
        toast.success('Goal health updated');
        await fetchGoals();
        if (detailGoal.value && detailGoal.value.id === goalId) {
          await openDetail(detailGoal.value);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update status');
      }
    };

    const archiveGoal = async (goalId: string) => {
      try {
        await api.post(`/goals/${goalId}/archive`);
        toast.success('Goal archived');
        await fetchGoals();
        if (detailGoal.value && detailGoal.value.id === goalId) {
          await openDetail(detailGoal.value);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to archive goal');
      }
    };

    const unarchiveGoal = async (goalId: string) => {
      try {
        await api.post(`/goals/${goalId}/unarchive`);
        toast.success('Goal restored');
        await fetchGoals();
        if (detailGoal.value && detailGoal.value.id === goalId) {
          await openDetail(detailGoal.value);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to unarchive goal');
      }
    };

    const getLinkedEntityName = (link: any) => {
      if (link.entityType === 'PROJECT') {
        const p = projects.value.find(x => x.id === link.entityId);
        return p ? `${p.name} (${p.key})` : `Project #${link.entityId.substring(0, 5)}`;
      } else if (link.entityType === 'EPIC') {
        const e = epics.value.find(x => x.id === link.entityId);
        return e ? `${e.key} - ${e.summary}` : `Epic #${link.entityId.substring(0, 5)}`;
      }
      return link.entityId;
    };

    const statusColor = (status: string) => {
      switch (status) {
        case 'ON_TRACK': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        case 'AT_RISK': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'OFF_TRACK': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        case 'COMPLETED': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        default: return 'bg-slate-100 text-slate-600';
      }
    };

    const formatDate = (d: string) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    watch(workspaceId, (wId) => {
      if (wId) {
        fetchMembers(wId);
        fetchLinkOptions();
        fetchGoals();
        fetchObjectivesOnly();
      }
    }, { immediate: true });

    onMounted(async () => {
      if (workspaceId.value) {
        await fetchGoals();
        await fetchLinkOptions();
        await fetchObjectivesOnly();
      }
    });

    return { 
      isProjectView,
      loading, 
      goals, 
      showModal, 
      form, 
      openCreateModal, 
      onParentChange,
      createGoal, 
      deleteGoal, 
      statusColor, 
      showHelp,
      quickUpdateId,
      quickUpdateVal,
      quickUpdateNote,
      saveQuickUpdate,
      detailGoal,
      detailTab,
      openDetail,
      showLinkModal,
      linkForm,
      projects,
      epics,
      members,
      submitLink,
      unlinkEntity,
      getLinkedEntityName,
      formatDate,
      updateGoalStatus,
      archiveGoal,
      unarchiveGoal,
      objectivesOnly,
      filterCycle,
      filterOwner,
      showArchived
    };
  },
});
</script>

<style scoped>
/* Drawer Transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
  opacity: 0.85;
}
</style>
