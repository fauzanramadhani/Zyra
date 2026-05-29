<template>
  <div v-if="editor" class="border border-gray-300 dark:border-slate-600 rounded-md overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex flex-col">
    <!-- Toolbar (Hidden when readonly is true) -->
    <div v-if="!readonly" class="bg-gray-50 dark:bg-slate-900 border-b border-gray-300 dark:border-slate-600 p-2 flex flex-wrap gap-1 items-center">
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white': editor.isActive('bold') }"
        class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-slate-300 text-sm font-semibold"
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white': editor.isActive('italic') }"
        class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-slate-300 text-sm italic"
        title="Italic"
      >
        I
      </button>
      <div class="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1"></div>
      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white': editor.isActive('heading', { level: 2 }) }"
        class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-slate-300 text-sm font-bold"
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white': editor.isActive('heading', { level: 3 }) }"
        class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-slate-300 text-sm font-bold"
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        @click="editor.chain().focus().setParagraph().run()"
        :class="{ 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white': editor.isActive('paragraph') }"
        class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-slate-300 text-sm"
        title="Normal text"
      >
        P
      </button>
      <div class="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1"></div>
      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white': editor.isActive('bulletList') }"
        class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-slate-300 text-sm font-semibold"
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white': editor.isActive('orderedList') }"
        class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-slate-300 text-sm font-semibold"
        title="Numbered List"
      >
        1. List
      </button>
    </div>

    <!-- TipTap Editor Content mount -->
    <editor-content :editor="editor" class="prose max-w-none focus:outline-none flex-grow" />
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

export default defineComponent({
  name: 'TipTapEditor',
  components: {
    EditorContent,
  },
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const editor = useEditor({
      content: props.modelValue,
      extensions: [StarterKit],
      editable: !props.readonly,
      onUpdate: () => {
        emit('update:modelValue', editor.value?.getHTML());
      },
    });

    // Keep editor sync with parent state values
    watch(
      () => props.modelValue,
      (newValue) => {
        const isSame = editor.value?.getHTML() === newValue;
        if (!isSame && editor.value) {
          editor.value.commands.setContent(newValue, false);
        }
      }
    );

    watch(
      () => props.readonly,
      (newReadonly) => {
        if (editor.value) {
          editor.value.setEditable(!newReadonly);
        }
      }
    );

    onBeforeUnmount(() => {
      editor.value?.destroy();
    });

    return {
      editor,
    };
  },
});
</script>
