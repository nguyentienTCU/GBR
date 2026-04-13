"use client";

import { useEffect } from "react";

export default function AgreementReturnPage() {
  useEffect(() => {
    window.parent.postMessage(
      { type: "DOCUSIGN_SIGNING_DONE" },
      window.location.origin,
    );
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E7D3A1] border-t-[#0B1630]" />
    </div>
  );
}