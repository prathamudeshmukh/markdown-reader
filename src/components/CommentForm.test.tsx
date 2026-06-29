import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CommentForm from './CommentForm';

describe('CommentForm', () => {
  const defaultProps = {
    anchorText: null,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  it('renders name input, textarea, and submit button', () => {
    render(<CommentForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/anonymous/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /comment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('disables submit button when comment textarea is empty', () => {
    render(<CommentForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('enables submit button when comment has text', () => {
    render(<CommentForm {...defaultProps} />);
    fireEvent.change(screen.getByRole('textbox', { name: /comment/i }), {
      target: { value: 'Hello world' },
    });
    expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled();
  });

  it('disables submit button while submitting', () => {
    render(<CommentForm {...defaultProps} isSubmitting={true} />);
    const textarea = screen.getByRole('textbox', { name: /comment/i });
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('shows character counter when content length exceeds 1800', () => {
    render(<CommentForm {...defaultProps} />);
    const textarea = screen.getByRole('textbox', { name: /comment/i });
    fireEvent.change(textarea, { target: { value: 'x'.repeat(1801) } });
    expect(screen.getByText(/1801\s*\/\s*2000/)).toBeInTheDocument();
  });

  it('does not show character counter below 1800 chars', () => {
    render(<CommentForm {...defaultProps} />);
    const textarea = screen.getByRole('textbox', { name: /comment/i });
    fireEvent.change(textarea, { target: { value: 'x'.repeat(100) } });
    expect(screen.queryByText(/\/\s*2000/)).not.toBeInTheDocument();
  });

  it('name field accepts empty value', () => {
    render(<CommentForm {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText(/anonymous/i);
    fireEvent.change(nameInput, { target: { value: '' } });
    expect(nameInput).toHaveValue('');
  });

  it('shows anchor passage preview when anchorText is set', () => {
    render(<CommentForm {...defaultProps} anchorText="selected passage text" />);
    expect(screen.getByText(/selected passage text/)).toBeInTheDocument();
  });

  it('does not show anchor preview when anchorText is null', () => {
    render(<CommentForm {...defaultProps} anchorText={null} />);
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('calls onSubmit with content, authorName, and anchorText', () => {
    const onSubmit = vi.fn();
    render(<CommentForm {...defaultProps} anchorText="passage" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/anonymous/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByRole('textbox', { name: /comment/i }), { target: { value: 'Great point' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      content: 'Great point',
      authorName: 'Bob',
      anchorText: 'passage',
    });
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<CommentForm {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('hides name input when authorName prop is provided', () => {
    render(<CommentForm {...defaultProps} authorName="Alice Smith" />);
    expect(screen.queryByPlaceholderText(/anonymous/i)).not.toBeInTheDocument();
  });

  it('submits with provided authorName without touching name input', () => {
    const onSubmit = vi.fn();
    render(<CommentForm {...defaultProps} authorName="Alice Smith" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox', { name: /comment/i }), {
      target: { value: 'Great doc' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      content: 'Great doc',
      authorName: 'Alice Smith',
      anchorText: null,
    });
  });
});
