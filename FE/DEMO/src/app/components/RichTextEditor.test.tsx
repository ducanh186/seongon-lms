import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
  it('edits HTML blocks and exposes formatting and image controls', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>Xin chào</p>" onChange={onChange} onUploadImage={vi.fn()} />);

    const editor = screen.getByRole('textbox', { name: 'Nội dung' });
    expect(editor).toHaveAttribute('contenteditable', 'true');
    expect(screen.getByRole('button', { name: 'In đậm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chèn ảnh' })).toBeInTheDocument();

    editor.innerHTML = '<p>Đoạn mới</p>';
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalledWith('<p>Đoạn mới</p>');
  });
});
