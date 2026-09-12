import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('restores the editor selection before inserting an uploaded image', async () => {
    const onUploadImage = vi.fn().mockResolvedValue('/storage/news-images/hero.png');
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    const { container } = render(<RichTextEditor value="<p>Xin chào</p>" onChange={vi.fn()} onUploadImage={onUploadImage} />);
    const editor = screen.getByRole('textbox', { name: 'Nội dung' });
    const text = editor.querySelector('p')?.firstChild;
    const range = document.createRange();
    range.setStart(text!, 0);
    range.setEnd(text!, 3);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Chèn ảnh' }));
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(['image'], 'hero.png', { type: 'image/png' })] } });

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('insertImage', false, '/storage/news-images/hero.png'));
    expect(window.getSelection()?.rangeCount).toBe(1);
    delete (document as Document & { execCommand?: unknown }).execCommand;
  });
});
