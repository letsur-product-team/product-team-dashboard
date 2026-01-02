import React from 'react';

export default function CardSkeleton() {
    return (
        <div className="animate-pulse flex space-x-4 p-4 bg-white/30 rounded-lg border border-white/20">
            <div className="flex-1 space-y-3 py-1">
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                    <div className="h-2 bg-gray-200 rounded"></div>
                    <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                </div>
            </div>
        </div>
    );
}
