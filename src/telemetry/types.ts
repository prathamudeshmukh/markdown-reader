export type RouteKind = 'root' | 'doc';
export type InteractionSource = 'button' | 'shortcut';
export type ContentLengthBucket = 'empty' | 'xs' | 'sm' | 'md' | 'lg';

export type TelemetryEventName =
  | 'app_opened'
  | 'doc_opened'
  | 'doc_save_clicked'
  | 'doc_save_succeeded'
  | 'doc_save_failed'
  | 'mode_toggled'
  | 'link_copied'
  | 'markdown_copied'
  | 'qr_opened'
  | 'pdf_exported'
  | 'markdown_downloaded'
  | 'pdf_imported'
  | 'recent_doc_opened'
  | 'auth_sign_in_clicked'
  | 'auth_sign_in_email_submitted'
  | 'auth_sign_in_succeeded'
  | 'auth_sign_out';

export interface TelemetrySharedProps {
  session_id: string;
  app_version: string;
  route_kind: RouteKind;
}

export interface TelemetryPropsByEvent {
  app_opened: {
    entry: 'new_doc' | 'existing_doc';
    has_slug: boolean;
  };
  doc_opened: {
    has_slug: boolean;
    content_length_bucket: ContentLengthBucket;
  };
  doc_save_clicked: {
    content_length_bucket: ContentLengthBucket;
    source: InteractionSource;
  };
  doc_save_succeeded: {
    slug_created: boolean;
  };
  doc_save_failed: {
    error_type: string;
  };
  mode_toggled: {
    from_mode: 'editor' | 'preview';
    to_mode: 'editor' | 'preview';
    source: InteractionSource;
  };
  link_copied: {
    has_slug: boolean;
    source: InteractionSource;
  };
  markdown_copied: {
    content_length_bucket: ContentLengthBucket;
  };
  qr_opened: {
    has_slug: boolean;
  };
  pdf_exported: {
    mode_at_export: 'editor' | 'preview';
  };
  markdown_downloaded: {
    content_length_bucket: ContentLengthBucket;
  };
  pdf_imported: {
    page_count: number;
    content_length_bucket: ContentLengthBucket;
  };
  recent_doc_opened: {
    source: 'sidebar' | 'dropdown';
  };
  auth_sign_in_clicked: Record<string, never>;
  auth_sign_in_email_submitted: Record<string, never>;
  auth_sign_in_succeeded: Record<string, never>;
  auth_sign_out: Record<string, never>;
}
