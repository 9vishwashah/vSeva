import Skeleton from './Skeleton';

const EntriesSkeleton = () => {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>

          <Skeleton className="h-3 w-3/4" />

          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default EntriesSkeleton;
