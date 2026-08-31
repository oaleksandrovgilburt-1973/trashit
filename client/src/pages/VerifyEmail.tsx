import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const verifyMutation = trpc.clientAuth.verifyEmail.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setStatus("success");
      setTimeout(() => navigate("/"), 2500);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Липсва токен за потвърждение.");
      return;
    }
    verifyMutation.mutate({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Потвърждаваме имейла ви...</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Имейлът е потвърден!</h2>
              <p className="text-muted-foreground">Пренасочваме ви...</p>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Грешка</h2>
              <p className="text-muted-foreground mb-6">{errorMsg}</p>
              <Button onClick={() => navigate("/auth")} className="rounded-xl">Обратно към вход</Button>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
