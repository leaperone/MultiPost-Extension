'use client';

// Re-export the PublishTaskModal from drafts since it only needs a draftId prop
// which we can read from the md-draft store at the call site
export { default } from '../../../drafts/-components/PublishTaskModal';
