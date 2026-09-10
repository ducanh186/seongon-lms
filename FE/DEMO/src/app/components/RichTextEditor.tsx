import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
};

export function RichTextEditor({ value, onChange, onUploadImage }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const format = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const insertImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const url = await onUploadImage(file);
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
        <Button type="button" size="small" onClick={() => format('bold')} aria-label="In đậm">B</Button>
        <Button type="button" size="small" onClick={() => format('italic')} aria-label="In nghiêng"><em>I</em></Button>
        <Button type="button" size="small" onClick={() => format('formatBlock', 'h2')} aria-label="Tiêu đề phụ">H2</Button>
        <Button type="button" size="small" onClick={() => format('insertUnorderedList')} aria-label="Danh sách">☷</Button>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Button type="button" size="small" disabled={uploading} onClick={() => fileRef.current?.click()} aria-label="Chèn ảnh">
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
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        sx={{ minHeight: 220, p: 2, outline: 'none', '& img': { maxWidth: '100%', height: 'auto' }, '&:focus': { boxShadow: 'inset 0 0 0 2px', boxShadowColor: 'primary.main' } }}
      />
    </Box>
  );
}
