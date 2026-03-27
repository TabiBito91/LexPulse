export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
      <h1 className="text-lg font-semibold">Access not granted</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        Your GitHub account is not on the access list for LexPulse. Contact the
        owner to request access.
      </p>
    </div>
  );
}
