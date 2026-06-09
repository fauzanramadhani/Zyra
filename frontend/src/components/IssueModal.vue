<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm p-4 overflow-y-auto">
    <!-- Modal container -->
    <div class="bg-white dark:bg-zyra-gray-darkCard rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] text-[#172B4D] dark:text-slate-200">
      <!-- Header -->
      <div class="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-zyra-gray-darkBorder">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-500 uppercase tracking-wider">{{ issue?.key }}</span>
          <span v-if="issue?.type" class="px-2 py-0.5 text-xs font-bold rounded-full" :class="typeBadgeClass(issue.type)">
            {{ issue.type }}
          </span>
        </div>
        <button @click="close" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition">
          <XIcon class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-8 flex justify-center items-center flex-grow">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-zyra-primary"></div>
      </div>

      <!-- Main Body -->
      <div v-else-if="issue" class="flex flex-col md:flex-row flex-grow overflow-y-auto">
        <!-- Main Description / Left Column -->
        <div class="flex-grow p-6 md:w-3/5 overflow-y-auto space-y-6">
          <!-- Summary Header -->
          <div>
            <input
              type="text"
              v-model="summaryInput"
              @blur="updateField('summary', summaryInput)"
              maxlength="255"
              class="w-full text-2xl font-bold border-none bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-zyra-primary px-2 py-1 rounded transition duration-150 dark:text-white"
            />
          </div>

          <!-- Description -->
          <div>
            <h4 class="text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">Description</h4>
            <TipTapEditor v-model="descriptionInput" />
            <div class="flex justify-end gap-2 mt-2">
              <button
                @click="updateField('description', descriptionInput)"
                class="px-3 py-1.5 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-xs font-semibold rounded shadow transition"
              >
                Save Description
              </button>
            </div>
          </div>

          <!-- Subtasks -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-sm font-semibold text-gray-600 dark:text-slate-400">Subtasks</h4>
              <button @click="showAddSubtask = !showAddSubtask" class="text-xs text-zyra-primary font-semibold hover:underline">
                + Add Subtask
              </button>
            </div>

            <!-- Subtask list -->
            <div v-if="issue.subtasks && issue.subtasks.length > 0" class="space-y-2 mb-3">
              <div v-for="sub in issue.subtasks" :key="sub.id" class="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded hover:shadow-sm transition">
                <span class="text-sm font-medium">{{ sub.key }}: {{ sub.summary }}</span>
                <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-200 text-gray-600">
                  {{ sub.status?.name }}
                </span>
              </div>
            </div>

            <!-- Add subtask form -->
            <div v-if="showAddSubtask" class="flex gap-2 mb-3">
              <input
                type="text"
                v-model="subtaskSummary"
                placeholder="What needs to be done?"
                maxlength="255"
                class="flex-grow border border-gray-300 dark:border-slate-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary focus:border-transparent outline-none"
                @keyup.enter="createSubtask"
              />
              <button @click="createSubtask" class="px-3 py-1.5 bg-zyra-primary text-white text-xs font-semibold rounded hover:bg-zyra-primary-hover shadow transition">
                Add
              </button>
            </div>
          </div>

          <!-- Linked Issues (Blocked/Blocking) -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-sm font-semibold text-gray-600 dark:text-slate-400">Linked Issues</h4>
              <button @click="showAddLink = !showAddLink" class="text-xs text-zyra-primary font-semibold hover:underline">
                + Add Link
              </button>
            </div>

            <!-- Existing links -->
            <div v-if="issueLinks.length > 0" class="space-y-2 mb-3">
              <div v-for="link in issueLinks" :key="link.id" class="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded hover:shadow-sm transition group">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                    :class="link.linkType === 'BLOCKS' ? 'bg-red-100 text-red-700' : link.linkType === 'IS_BLOCKED_BY' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'">
                    {{ linkTypeLabel(link.linkType) }}
                  </span>
                  <span class="text-xs font-bold text-gray-500">{{ link.issue?.key }}</span>
                  <span class="text-sm text-gray-700 truncate">{{ link.issue?.summary }}</span>
                </div>
                <button @click="removeLink(link.id)" class="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                  <TrashIcon class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400 mb-3">No linked issues</p>

            <!-- Add link form -->
            <div v-if="showAddLink" class="p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg space-y-2">
              <select v-model="newLinkType" class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none">
                <option value="BLOCKS">Blocks</option>
                <option value="IS_BLOCKED_BY">Is blocked by</option>
                <option value="RELATES_TO">Relates to</option>
                <option value="DUPLICATES">Duplicates</option>
                <option value="IS_DUPLICATED_BY">Is duplicated by</option>
              </select>
              <div class="relative">
                <input
                  type="text"
                  v-model="linkSearchQuery"
                  @input="searchIssuesForLink"
                  placeholder="Search issue by key or summary..."
                  class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none"
                />
                <!-- Loading indicator -->
                <div v-if="linkSearchLoading" class="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-center text-xs text-gray-500">
                  <span class="animate-pulse">Searching...</span>
                </div>
                <!-- Search results dropdown -->
                <div v-if="linkSearchResults.length > 0 && !linkSearchLoading" class="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  <button
                    v-for="result in linkSearchResults"
                    :key="result.id"
                    @click="selectLinkTarget(result)"
                    class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:bg-slate-700 text-sm flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                  >
                    <span class="font-bold text-gray-500 text-xs">{{ result.key }}</span>
                    <span class="truncate text-gray-700">{{ result.summary }}</span>
                  </button>
                </div>
              </div>
              <div v-if="selectedLinkTarget" class="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded">
                <span class="text-xs font-bold text-gray-500">{{ selectedLinkTarget.key }}</span>
                <span class="text-sm text-gray-700 truncate">{{ selectedLinkTarget.summary }}</span>
                <button @click="selectedLinkTarget = null" class="ml-auto text-gray-400 hover:text-gray-600">
                  <XIcon class="w-3.5 h-3.5" />
                </button>
              </div>
              <div class="flex justify-end gap-2">
                <button @click="showAddLink = false; linkSearchQuery = ''; linkSearchResults = []; selectedLinkTarget = null" class="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded transition">
                  Cancel
                </button>
                <button @click="createLink" :disabled="!selectedLinkTarget" class="px-3 py-1.5 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-xs font-semibold rounded shadow transition disabled:opacity-50 disabled:cursor-not-allowed">
                  Link Issue
                </button>
              </div>
            </div>
          </div>

          <!-- Attachments -->
          <div>
            <h4 class="text-sm font-semibold text-gray-600 dark:text-slate-400 mb-2">Attachments</h4>
            
            <!-- Grid displaying files -->
            <div v-if="issue.attachments && issue.attachments.length > 0" class="grid grid-cols-2 gap-3 mb-3">
              <div v-for="att in issue.attachments" :key="att.id" class="flex items-center gap-3 p-2.5 border border-gray-200 dark:border-slate-700 rounded hover:shadow-sm transition bg-white dark:bg-slate-800 relative group">
                <PaperclipIcon class="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div class="min-w-0 flex-grow">
                  <p class="text-xs font-semibold truncate text-gray-700" :title="att.filename">{{ att.filename }}</p>
                  <p class="text-[10px] text-gray-400">{{ (att.size / 1024).toFixed(1) }} KB</p>
                </div>
                <div class="flex gap-1">
                  <a :href="att.fileUrl" target="_blank" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600">
                    <DownloadIcon class="w-4 h-4" />
                  </a>
                  <button @click="deleteAttachment(att.id)" class="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition duration-150">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Upload drag drop -->
            <div
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              :class="{ 'border-zyra-primary bg-orange-50': isDragging }"
              class="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-5 text-center bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:bg-slate-700 transition cursor-pointer"
              @click="$refs.fileInput.click()"
            >
              <input type="file" ref="fileInput" class="hidden" @change="handleFileSelect" />
              <UploadCloudIcon class="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p class="text-xs font-semibold text-gray-600">Drag files here, or click to browse</p>
              <p class="text-[10px] text-gray-400 mt-1">Supports images, documents, logs up to 50MB</p>
            </div>
          </div>

          <!-- Comments Feed -->
          <div>
            <h4 class="text-sm font-semibold text-gray-600 dark:text-slate-400 mb-3">Comments</h4>
            
            <!-- Comment entry box -->
            <div class="flex gap-3 mb-5">
              <UserAvatar :src="authStore.user?.avatarUrl || ''" :firstName="authStore.user?.firstName || ''" :lastName="authStore.user?.lastName || ''" sizeClass="w-8 h-8" />
              <div class="flex-grow">
                <textarea
                  v-model="commentInput"
                  placeholder="Add a comment..."
                  maxlength="2000"
                  rows="2"
                  class="w-full border border-gray-300 dark:border-slate-600 rounded-md p-2.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary focus:border-transparent outline-none transition"
                ></textarea>
                <div v-if="commentInput.trim()" class="flex justify-end gap-2 mt-2">
                  <button
                    @click="addComment"
                    class="px-3 py-1.5 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-xs font-semibold rounded shadow transition"
                  >
                    Save Comment
                  </button>
                </div>
              </div>
            </div>

            <!-- Comment items list -->
            <div class="space-y-4">
              <div v-for="c in issue.comments" :key="c.id" class="flex gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-150 dark:border-slate-700 relative group">
                <UserAvatar :src="c.author.avatarUrl || ''" :firstName="c.author.firstName || ''" :lastName="c.author.lastName || ''" sizeClass="w-8 h-8" />
                <div class="flex-grow min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-gray-800 dark:text-slate-200">{{ c.author.firstName }} {{ c.author.lastName }}</span>
                    <span class="text-[10px] text-gray-400 dark:text-slate-500">{{ formatDate(c.createdAt) }}</span>
                  </div>
                  <div class="text-sm text-gray-700 dark:text-slate-300" v-html="sanitizeHtml(c.body)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Attributes / Right Column -->
        <div class="p-6 md:w-2/5 border-t md:border-t-0 md:border-l border-gray-200 dark:border-zyra-gray-darkBorder bg-gray-50 dark:bg-slate-900 flex flex-col space-y-5 overflow-y-auto">
          <!-- Status select -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Status</label>
            <select
              v-model="statusSelect"
              @change="updateField('statusId', statusSelect)"
              class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none transition"
            >
              <option v-for="col in columns" :key="col.id" :value="col.id">
                {{ col.name }}
              </option>
            </select>
          </div>

          <!-- SLA tracking widget -->
          <div class="p-3 bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">SLA Targets</label>
            <div v-if="slaTrackers && slaTrackers.length > 0" class="space-y-2">
              <div v-for="sla in slaTrackers" :key="sla.id" class="p-2.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                <div class="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-705 pb-1">
                  Policy: {{ sla.slaPolicy?.name }}
                </div>
                
                <!-- Start Work SLA Status -->
                <div v-if="sla.startWorkStatus !== 'NONE'" class="flex justify-between items-center text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Start Work:</span>
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border" :class="slaBadgeClass(sla.startWorkStatus)">
                    {{ slaStatusLabel(sla.startWorkStatus, sla.remainingStartWorkMs, sla.overdueStartWorkMs) }}
                  </span>
                </div>

                <!-- Resolution SLA Status -->
                <div v-if="sla.resolutionStatus !== 'NONE'" class="flex justify-between items-center text-xs">
                  <span class="text-slate-500 dark:text-slate-400">Resolution:</span>
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border" :class="slaBadgeClass(sla.resolutionStatus)">
                    {{ slaStatusLabel(sla.resolutionStatus, sla.remainingResolutionMs, sla.overdueResolutionMs) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-slate-400 italic">No SLA policy configured for this issue priority.</div>
          </div>

          <!-- Assignee select -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Assignee</label>
            <select
              v-model="assigneeSelect"
              @change="updateField('assigneeId', assigneeSelect)"
              class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none transition"
            >
              <option :value="null">Unassigned</option>
              <option v-for="m in members" :key="m.user?.id || m.id" :value="m.user?.id || m.id">
                {{ m.user?.firstName }} {{ m.user?.lastName }}
              </option>
            </select>
          </div>

          <!-- Priority selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Priority</label>
            <select
              v-model="prioritySelect"
              @change="updateField('priority', prioritySelect)"
              class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none transition"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="HIGHEST">Highest / Blocker</option>
            </select>
          </div>

          <!-- Story Points selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Story Points</label>
            <input
              type="number"
              v-model="storyPointsInput"
              @blur="updateField('storyPoints', storyPointsInput)"
              class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none transition"
              min="0"
              max="100"
              placeholder="e.g. 5"
            />
          </div>

          <!-- Sprints selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Sprint</label>
            <select
              v-model="sprintSelect"
              @change="updateField('sprintId', sprintSelect)"
              class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none transition"
            >
              <option :value="null">None (Backlog)</option>
              <option v-for="s in activeSprints" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.status }})
              </option>
            </select>
          </div>

          <!-- Due Date selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Due Date</label>
            <input
              type="date"
              v-model="dueDateInput"
              @change="updateField('dueDate', dueDateInput)"
              class="w-full border border-gray-300 dark:border-slate-600 rounded px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-zyra-primary outline-none transition"
            />
          </div>

          <!-- Custom Fields display -->
          <div v-if="issue.customFields && issue.customFields.length > 0">
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2">Imported Fields</label>
            <div class="space-y-2 p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
              <div v-for="cf in issue.customFields" :key="cf.id" class="flex justify-between items-start text-xs border-b border-gray-100 dark:border-slate-700 pb-1.5 last:border-b-0 last:pb-0">
                <span class="font-bold text-gray-500 dark:text-slate-300">{{ cf.fieldName }}:</span>
                <span class="text-gray-700 dark:text-slate-200 font-medium ml-2 text-right break-words max-w-[150px]">{{ cf.fieldValue }}</span>
              </div>
            </div>
          </div>

          <!-- Watchers -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Watchers</label>
            <div class="flex items-center gap-2 flex-wrap">
              <div v-for="w in watchers" :key="w.id" class="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-xs">
                <UserAvatar :src="w.user?.avatarUrl || ''" :firstName="w.user?.firstName || ''" :lastName="w.user?.lastName || ''" sizeClass="w-4 h-4" />
                <span class="text-gray-700 dark:text-slate-300">{{ w.user?.firstName }}</span>
              </div>
              <button v-if="!isWatching" @click="watchIssue" class="px-2 py-1 text-xs font-medium text-zyra-primary hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full border border-orange-200 dark:border-orange-800 transition">
                + Watch
              </button>
              <button v-else @click="unwatchIssue" class="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full border border-red-200 dark:border-red-800 transition">
                Unwatch
              </button>
            </div>
          </div>

          <!-- Time Tracking -->
          <div>
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1.5">Time Tracking</label>
            <div class="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-gray-500 dark:text-slate-400">Logged:</span>
                <span class="font-bold text-gray-700 dark:text-slate-200">{{ timeSummary.totalHours || 0 }}h</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-500 dark:text-slate-400">Entries:</span>
                <span class="font-bold text-gray-700 dark:text-slate-200">{{ timeSummary.logCount || 0 }}</span>
              </div>
              <button @click="showLogTimeModal = true" class="w-full mt-1 px-3 py-1.5 text-xs font-semibold text-zyra-primary border border-orange-200 dark:border-orange-800 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition">
                + Log Time
              </button>
            </div>
          </div>

          <!-- Issue Action Buttons -->
          <div class="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-2">
            <label class="block text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-1">Issue Actions</label>
            <div class="flex gap-2">
              <button type="button" @click="archiveIssue" class="flex-grow px-3 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 text-xs font-semibold rounded transition text-center shadow-sm">
                Archive
              </button>
              <button type="button" @click="deleteIssue" class="flex-grow px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded transition text-center shadow-sm">
                Delete Task
              </button>
            </div>
          </div>

          <div class="border-t border-gray-200 dark:border-slate-700 pt-4 text-[10px] text-gray-400 dark:text-slate-500">
            <p>Created: {{ formatDate(issue.createdAt) }}</p>
            <p>Updated: {{ formatDate(issue.updatedAt) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Log Time Modal -->
  <div v-if="showLogTimeModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" @click.self="showLogTimeModal = false">
    <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-xl w-full max-w-sm p-5">
      <h3 class="text-sm font-bold text-slate-800 dark:text-white mb-3">Log Time</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Time Spent (minutes) *</label>
          <input v-model.number="logTimeForm.timeSpent" type="number" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white text-sm" placeholder="60" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Description</label>
          <input v-model="logTimeForm.description" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white text-sm" placeholder="What did you work on?" />
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button @click="showLogTimeModal = false" class="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-400">Cancel</button>
        <button @click="logTime" class="px-3 py-1.5 bg-zyra-primary text-white text-xs font-semibold rounded hover:bg-zyra-primary-hover transition">Log</button>
      </div>
    </div>
  </div>

  <!-- Confirm Dialog -->
  <AppConfirmDialog
    v-model="confirmAction.show"
    :title="confirmAction.title"
    :message="confirmAction.message"
    variant="danger"
    confirm-text="Confirm"
    @confirm="onConfirmAction"
  />
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from 'vue';
import DOMPurify from 'dompurify';
import { useAuthStore } from '../store/auth';
import { useProjectStore } from '../store/project';
import { useToastStore } from '../store/toast';
import AppConfirmDialog from './ui/AppConfirmDialog.vue';
import { UserAvatar } from './ui';
import api from '../services/api';
import TipTapEditor from './TipTapEditor.vue';
import {
  X as XIcon,
  Paperclip as PaperclipIcon,
  Download as DownloadIcon,
  Trash as TrashIcon,
  UploadCloud as UploadCloudIcon
} from 'lucide-vue-next';

export default defineComponent({
  name: 'IssueModal',
  components: {
    TipTapEditor,
    XIcon,
    PaperclipIcon,
    DownloadIcon,
    TrashIcon,
    UploadCloudIcon,
    AppConfirmDialog,
    UserAvatar,
  },
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    issueId: {
      type: String,
      default: '',
    },
    columns: {
      type: Array as any,
      default: () => [],
    },
    members: {
      type: Array as any,
      default: () => [],
    },
    activeSprints: {
      type: Array as any,
      default: () => [],
    },
  },
  emits: ['close', 'updated'],
  setup(props, { emit }) {
    const authStore = useAuthStore();
    const projectStore = useProjectStore();
    const toast = useToastStore();
    const issue = ref<any>(null);
    const loading = ref(false);

    // Inputs state
    const summaryInput = ref('');
    const descriptionInput = ref('');
    const statusSelect = ref('');
    const assigneeSelect = ref<string | null>(null);
    const prioritySelect = ref('');
    const storyPointsInput = ref('');
    const sprintSelect = ref<string | null>(null);
    const dueDateInput = ref('');

    // Comments / attachments state
    const commentInput = ref('');
    const isDragging = ref(false);

    // Subtasks
    const showAddSubtask = ref(false);
    const subtaskSummary = ref('');

    // Linked Issues
    const issueLinks = ref<any[]>([]);
    const showAddLink = ref(false);
    const newLinkType = ref('BLOCKS');
    const linkSearchQuery = ref('');
    const linkSearchResults = ref<any[]>([]);
    const selectedLinkTarget = ref<any>(null);

    // Watchers & Time Tracking
    const watchers = ref<any[]>([]);
    const isWatching = ref(false);
    const timeSummary = ref({ totalHours: 0, logCount: 0 });
    const showLogTimeModal = ref(false);
    const logTimeForm = ref({ timeSpent: 60, description: '' });

    const currentUserAvatar = computed(() => authStore.user?.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zyra');

    // Fetch Issue Details
    const loadIssueDetails = async (id: string) => {
      if (loading.value) return; // Guard: prevent concurrent calls
      if (!id) return;
      loading.value = true;
      try {
        const response = await api.get(`/issues/${id}`);
        if (response.data.success) {
          issue.value = response.data.data;

          // Map to inputs
          summaryInput.value = issue.value.summary;
          descriptionInput.value = issue.value.description || '';
          statusSelect.value = issue.value.statusId;
          assigneeSelect.value = issue.value.assigneeId ?? null;
          prioritySelect.value = issue.value.priority;
          storyPointsInput.value = issue.value.storyPoints !== null ? String(issue.value.storyPoints) : '';
          sprintSelect.value = issue.value.sprintId ?? null;
          dueDateInput.value = issue.value.dueDate ? issue.value.dueDate.substring(0, 10) : '';

          // Load linked issues, watchers & time tracking (fire-and-forget, errors handled inside)
          loadIssueLinks(id).catch(e => console.error('Links load failed:', e));
          loadWatchers(id).catch(e => console.error('Watchers load failed:', e));
          loadTimeSummary(id).catch(e => console.error('Time summary failed:', e));
          loadSlaTrackers(id).catch(e => console.error('SLA load failed:', e));
        }
      } catch (err) {
        console.error('Failed to load issue details:', err);
      } finally {
        loading.value = false;
      }
    };

    const slaTrackers = ref<any[]>([]);
    const loadSlaTrackers = async (id: string) => {
      try {
        const res = await api.get(`/issues/${id}/sla`);
        slaTrackers.value = res.data?.data || [];
      } catch (err) {
        slaTrackers.value = [];
      }
    };

    // Single watcher: trigger load when both isOpen AND issueId are present
    watch(
      [() => props.isOpen, () => props.issueId],
      ([open, issueId]) => {
        if (open && issueId) {
          loadIssueDetails(issueId);
        } else if (!open) {
          issue.value = null;
        }
      }
    );

    // Generic Update API trigger
    const updateField = async (fieldName: string, value: any) => {
      if (!issue.value) return;

      const formattedVal = (value === 'null' || value === null) ? null : value;
      try {
        const response = await api.patch(`/issues/${issue.value.id}`, {
          [fieldName]: formattedVal,
        });

        if (response.data.success) {
          issue.value = { ...issue.value, ...response.data.data };
          emit('updated');
        }
      } catch (err: any) {
        console.error(`Failed to update ${fieldName}:`, err);
        toast.error(err.response?.data?.message || `Failed to update ${fieldName}`);
      }
    };

    // Create Subtask
    const createSubtask = async () => {
      if (!subtaskSummary.value.trim() || !issue.value) return;

      try {
        const response = await api.post(`/projects/${issue.value.projectId}/issues`, {
          summary: subtaskSummary.value,
          statusId: issue.value.statusId,
          type: 'TASK',
          parentId: issue.value.id,
        });

        if (response.data.success) {
          // Re-load issue to include the new subtask
          await loadIssueDetails(issue.value.id);
          subtaskSummary.value = '';
          showAddSubtask.value = false;
          toast.success('Subtask created successfully');
        }
      } catch (err: any) {
        console.error('Failed to create subtask:', err);
        toast.error(err.response?.data?.message || 'Failed to create subtask');
      }
    };

    // ── Linked Issues ────────────────────────────────────────────────────────
    const loadIssueLinks = async (issueId: string) => {
      try {
        const res = await api.get(`/issues/${issueId}/links`);
        issueLinks.value = res.data?.data || res.data || [];
      } catch (err) {
        issueLinks.value = [];
      }
    };

    // Watchers
    const loadWatchers = async (issueId: string) => {
      try {
        const res = await api.get(`/issues/${issueId}/watchers`);
        watchers.value = res.data?.data || [];
        const watchRes = await api.get(`/issues/${issueId}/watching`);
        isWatching.value = watchRes.data?.data?.watching || false;
      } catch {
        watchers.value = [];
        isWatching.value = false;
      }
    };

    const watchIssue = async () => {
      if (!issue.value) return;
      try {
        await api.post(`/issues/${issue.value.id}/watch`);
        isWatching.value = true;
        loadWatchers(issue.value.id);
      } catch { /* ignore */ }
    };

    const unwatchIssue = async () => {
      if (!issue.value) return;
      try {
        await api.delete(`/issues/${issue.value.id}/watch`);
        isWatching.value = false;
        loadWatchers(issue.value.id);
      } catch { /* ignore */ }
    };

    // Time Tracking
    const loadTimeSummary = async (issueId: string) => {
      try {
        const res = await api.get(`/issues/${issueId}/time-summary`);
        timeSummary.value = res.data?.data || { totalHours: 0, logCount: 0 };
      } catch {
        timeSummary.value = { totalHours: 0, logCount: 0 };
      }
    };

    const logTime = async () => {
      if (!issue.value || !logTimeForm.value.timeSpent) return;
      try {
        await api.post(`/issues/${issue.value.id}/worklogs`, logTimeForm.value);
        showLogTimeModal.value = false;
        logTimeForm.value = { timeSpent: 60, description: '' };
        loadTimeSummary(issue.value.id);
        toast.success('Work log added successfully');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to log time');
      }
    };

    const linkSearchLoading = ref(false);
    let linkSearchTimeout: any = null;
    const searchIssuesForLink = () => {
      clearTimeout(linkSearchTimeout);
      if (!linkSearchQuery.value.trim() || !issue.value) {
        linkSearchResults.value = [];
        linkSearchLoading.value = false;
        return;
      }
      linkSearchLoading.value = true;
      linkSearchTimeout = setTimeout(async () => {
        try {
          const res = await api.get(`/projects/${issue.value.projectId}/issues`, {
            params: { search: linkSearchQuery.value, limit: 10 }
          });
          const results = res.data?.data || res.data || [];
          // Exclude current issue from results
          linkSearchResults.value = results.filter((i: any) => i.id !== issue.value.id);
        } catch {
          linkSearchResults.value = [];
        } finally {
          linkSearchLoading.value = false;
        }
      }, 300);
    };

    const selectLinkTarget = (target: any) => {
      selectedLinkTarget.value = target;
      linkSearchQuery.value = '';
      linkSearchResults.value = [];
    };

    const createLink = async () => {
      if (!selectedLinkTarget.value || !issue.value) return;
      try {
        await api.post(`/issues/${issue.value.id}/links`, {
          targetIssueId: selectedLinkTarget.value.id,
          linkType: newLinkType.value,
        });
        await loadIssueLinks(issue.value.id);
        selectedLinkTarget.value = null;
        showAddLink.value = false;
        newLinkType.value = 'BLOCKS';
        emit('updated');
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to create link';
        toast.error(msg);
      }
    };

    const removeLink = async (linkId: string) => {
      if (!issue.value) return;
      try {
        await api.delete(`/issues/${issue.value.id}/links/${linkId}`);
        issueLinks.value = issueLinks.value.filter((l: any) => l.id !== linkId);
        emit('updated');
      } catch (err) {
        console.error('Failed to remove link:', err);
      }
    };

    const linkTypeLabel = (type: string) => {
      switch (type) {
        case 'BLOCKS': return 'blocks';
        case 'IS_BLOCKED_BY': return 'is blocked by';
        case 'RELATES_TO': return 'relates to';
        case 'DUPLICATES': return 'duplicates';
        case 'IS_DUPLICATED_BY': return 'is duplicated by';
        default: return type;
      }
    };

    // Add Comment
    const addComment = async () => {
      if (!commentInput.value.trim() || !issue.value) return;

      try {
        const response = await api.post(`/issues/${issue.value.id}/comments`, {
          body: commentInput.value,
        });

        if (response.data.success) {
          issue.value.comments.unshift(response.data.data);
          commentInput.value = '';
        }
      } catch (err) {
        console.error('Failed to post comment:', err);
      }
    };

    // Attachment uploading handler
    const uploadFile = async (file: File) => {
      if (!issue.value) return;

      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File size exceeds 50MB limit');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await api.post(`/issues/${issue.value.id}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          issue.value.attachments.push(response.data.data);
          toast.success('File uploaded successfully');
        }
      } catch (err: any) {
        console.error('File upload failed:', err);
        toast.error(err.response?.data?.message || 'File upload failed');
      }
    };

    const handleFileSelect = (e: any) => {
      const files = e.target.files;
      if (files && files[0]) {
        uploadFile(files[0]);
      }
    };

    const handleFileDrop = (e: any) => {
      isDragging.value = false;
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        uploadFile(files[0]);
      }
    };

    const deleteAttachment = async (attId: string) => {
      try {
        const response = await api.delete(`/attachments/${attId}`);
        if (response.data.success) {
          issue.value.attachments = issue.value.attachments.filter((a: any) => a.id !== attId);
        }
      } catch (err) {
        console.error('Failed to delete attachment:', err);
      }
    };

    const typeBadgeClass = (type: string) => {
      switch (type.toUpperCase()) {
        case 'BUG':
          return 'bg-red-100 text-red-700';
        case 'STORY':
          return 'bg-green-100 text-green-700';
        case 'EPIC':
          return 'bg-purple-100 text-purple-700';
        default:
          return 'bg-blue-100 text-blue-700';
      }
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    };

    const confirmAction = ref<{ show: boolean; title: string; message: string; action: () => void }>({ show: false, title: '', message: '', action: () => {} });

    const deleteIssue = async () => {
      if (!issue.value) return;
      confirmAction.value = {
        show: true,
        title: 'Delete Issue',
        message: 'Are you sure you want to delete this issue? It will move to the Trash Bin.',
        action: async () => {
          const success = await projectStore.deleteIssue(issue.value.id);
          if (success) {
            toast.success('Issue moved to recycle bin.');
            close();
          }
        }
      };
    };

    const archiveIssue = async () => {
      if (!issue.value) return;
      confirmAction.value = {
        show: true,
        title: 'Archive Issue',
        message: 'Are you sure you want to archive this issue?',
        action: async () => {
          const success = await projectStore.archiveIssue(issue.value.id);
          if (success) {
            toast.success('Issue archived successfully.');
            close();
          }
        }
      };
    };

    const onConfirmAction = async () => {
      confirmAction.value.show = false;
      await confirmAction.value.action();
    };

    const close = () => {
      emit('close');
    };

    const sanitizeHtml = (html: string) => {
      return DOMPurify.sanitize(html || '');
    };

    return {
      authStore,
      issue,
      loading,
      currentUserAvatar,
      summaryInput,
      descriptionInput,
      statusSelect,
      assigneeSelect,
      prioritySelect,
      storyPointsInput,
      sprintSelect,
      dueDateInput,
      commentInput,
      isDragging,
      showAddSubtask,
      subtaskSummary,
      createSubtask,
      updateField,
      addComment,
      handleFileSelect,
      handleFileDrop,
      deleteAttachment,
      typeBadgeClass,
      formatDate,
      close,
      deleteIssue,
      archiveIssue,
      confirmAction,
      onConfirmAction,
      // Linked Issues
      issueLinks,
      showAddLink,
      newLinkType,
      linkSearchQuery,
      linkSearchResults,
      selectedLinkTarget,
      searchIssuesForLink,
      selectLinkTarget,
      createLink,
      removeLink,
      linkTypeLabel,
      sanitizeHtml,
      linkSearchLoading,
      // Watchers & Time Tracking
      watchers,
      isWatching,
      watchIssue,
      unwatchIssue,
      timeSummary,
      showLogTimeModal,
      logTimeForm,
      logTime,
      slaTrackers,
      slaBadgeClass(status: string) {
        switch (status) {
          case 'MET':
            return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800';
          case 'MET_LATE':
          case 'BREACHED':
            return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800 animate-pulse';
          case 'DUE_SOON':
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800';
          default:
            return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
      },
      slaStatusLabel(status: string, remainingMs: number | null, overdueMs: number | null) {
        if (status === 'MET') return 'Met';
        if (status === 'MET_LATE') return 'Met Late';
        
        const timeMs = status === 'BREACHED' ? overdueMs : remainingMs;
        if (timeMs === null || timeMs === undefined) return status;
        
        const minutes = Math.floor(timeMs / 1000 / 60);
        if (minutes < 60) {
          return status === 'BREACHED' ? `Overdue ${minutes}m` : `${minutes}m left`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return status === 'BREACHED' 
          ? `Overdue ${hours}h ${remainingMins}m` 
          : `${hours}h ${remainingMins}m left`;
      },
    };
  },
});
</script>
