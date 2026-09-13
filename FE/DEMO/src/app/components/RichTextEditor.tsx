import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { resolveMaterialUrl } from '../lib/api';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
};

type FormatCommand = 'bold' | 'italic' | 'underline';
type ActiveFormats = Record<FormatCommand, boolean>;

const emptyActiveFormats: ActiveFormats = { bold: false, italic: false, underline: false };

export function RichTextEditor({ value, onChange, onUploadImage }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(emptyActiveFormats);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      const display = document.createElement('div');
      display.innerHTML = value;
      display.querySelectorAll<HTMLImageElement>('img[src]').forEach((image) => {
        const resolved = resolveMaterialUrl(image.getAttribute('src'));
        if (resolved) image.src = resolved;
      });
      editorRef.current.innerHTML = display.innerHTML;
    }
  }, [value]);

  const updateActiveFormats = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
      setActiveFormats(emptyActiveFormats);
      return;
    }

    const queryCommandState = typeof document.queryCommandState === 'function'
      ? document.queryCommandState.bind(document)
      : () => false;
    setActiveFormats({
      bold: queryCommandState('bold'),
      italic: queryCommandState('italic'),
      underline: queryCommandState('underline'),
    });
  };

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, []);

  const format = (command: FormatCommand) => {
    const selection = window.getSelection();
    const selectionIsInsideEditor = Boolean(
      selection?.rangeCount && editorRef.current?.contains(selection.anchorNode),
    );
    if (!selectionIsInsideEditor) restoreSelection();
    editorRef.current?.focus();
    document.execCommand(command, false);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    updateActiveFormats();
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const range = selectionRef.current;
    const selection = window.getSelection();
    if (!range || !selection || !editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const commandByKey: Record<string, FormatCommand> = { b: 'bold', i: 'italic', u: 'underline' };
    const command = commandByKey[event.key.toLowerCase()];
    if (!command) return;
    event.preventDefault();
    format(command);
  };

  const formatButtonSx = (active: boolean) => ({
    minWidth: 40,
    color: active ? 'primary.dark' : 'primary.main',
    bgcolor: active ? 'action.selected' : 'transparent',
    border: '1px solid',
    borderColor: active ? 'primary.main' : 'transparent',
    '&:hover': { bgcolor: active ? 'action.selected' : 'action.hover' },
    '&:active': { transform: 'scale(0.96)' },
  });

  const insertImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const url = await onUploadImage(file);
      restoreSelection();
      editorRef.current?.focus();
      document.execCommand('insertImage', false, url);
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ p: 1, bgcolor: 'grey.50', flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Định dạng</Typography>
        <Button type="button" size="small" title="In đậm (Ctrl/Cmd+B)" onMouseDown={saveSelection} onClick={() => format('bold')} aria-label="In đậm" aria-pressed={activeFormats.bold} sx={formatButtonSx(activeFormats.bold)}>B</Button>
        <Button type="button" size="small" title="In nghiêng (Ctrl/Cmd+I)" onMouseDown={saveSelection} onClick={() => format('italic')} aria-label="In nghiêng" aria-pressed={activeFormats.italic} sx={formatButtonSx(activeFormats.italic)}><em>I</em></Button>
        <Button type="button" size="small" title="Gạch chân (Ctrl/Cmd+U)" onMouseDown={saveSelection} onClick={() => format('underline')} aria-label="Gạch chân" aria-pressed={activeFormats.underline} sx={formatButtonSx(activeFormats.underline)}><u>U</u></Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Button type="button" size="small" disabled={uploading} onMouseDown={saveSelection} onClick={() => fileRef.current?.click()} aria-label="Chèn ảnh">
          {uploading ? 'Đang tải...' : 'Chèn ảnh'}
        </Button>
        <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void insertImage(event)} />
      </Stack>
      <Box
        ref={editorRef}
        role="textbox"
        aria-label="Nội dung"
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleEditorKeyDown}
        onFocus={updateActiveFormats}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        sx={{ minHeight: 220, p: 2, outline: 'none', '& img': { maxWidth: '100%', height: 'auto' }, '&:focus': { boxShadow: 'inset 0 0 0 2px', boxShadowColor: 'primary.main' } }}
      />
    </Box>
  );
}
