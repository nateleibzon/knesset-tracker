import React from 'react';

export const Spinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

export const SkeletonLine = ({ width = "w-full" }: { width?: string }) => (
    <div className={`h-4 bg-gray-200 rounded ${width} animate-pulse mb-2`}></div>
);