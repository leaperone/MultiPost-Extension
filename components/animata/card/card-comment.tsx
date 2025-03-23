import React from 'react';

interface CardCommentProps {
  commenter: string;
  replier: string;
}

export const CardComment = ({ commenter, replier }: CardCommentProps) => {
  return (
    <div className="storybook-fix group mx-auto h-48 w-full max-w-md rounded-xl bg-white p-4 shadow">
      <div className="relative flex h-40 flex-col space-y-4 overflow-hidden rounded-md bg-neutral-50 text-black shadow-sm hover:shadow-lg">
        <div className="h-fit p-4 transition-all group-hover:-translate-y-1/3">
          <h3 className="text-sm font-semibold">{commenter} commented</h3>
          <div className="my-2 h-3 w-full animate-pulse rounded-md bg-neutral-300" />
          <div className="my-2 h-3 w-2/5 animate-pulse rounded-md bg-neutral-300" />
        </div>

        <div className="w-full px-4 opacity-0 transition-all group-hover:-translate-y-1/3 group-hover:opacity-100">
          <div className="h-40 w-full rounded-md bg-green-500 p-4">
            <h3 className="text-sm font-semibold text-white">{replier} replied</h3>
            <div className="line my-2 h-3 w-full animate-pulse rounded-lg bg-white/50" />
            <div className="line my-2 h-3 w-full animate-pulse rounded-lg bg-white/50" />
            <div className="line2 my-2 h-3 w-2/5 animate-pulse rounded-lg bg-white/50" />
          </div>
        </div>
      </div>
    </div>
  );
};
