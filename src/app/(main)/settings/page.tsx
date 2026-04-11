"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type SettingsProfileResponse = {
  full_name: string;
  phone: string | null;
};

type InitialFormState = {
  fullName: string;
  phoneLocal: string;
};

function toLocalPhone(phone: string | null | undefined) {
  const raw = String(phone ?? "").trim();
  if (!raw) return "";

  if (raw.startsWith("+62")) {
    return raw.slice(3);
  }

  if (raw.startsWith("62")) {
    return raw.slice(2);
  }

  if (raw.startsWith("0")) {
    return raw.replace(/^0+/, "");
  }

  return raw;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function SettingsPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [initialState, setInitialState] = useState<InitialFormState>({
    fullName: "",
    phoneLocal: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const hasChanges = useMemo(() => {
    return (
      fullName.trim() !== initialState.fullName.trim() ||
      onlyDigits(phoneLocal) !== onlyDigits(initialState.phoneLocal)
    );
  }, [fullName, initialState.fullName, initialState.phoneLocal, phoneLocal]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/settings/profile", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as
        | SettingsProfileResponse
        | { message?: string };

      if (!response.ok || !("full_name" in result)) {
        setErrorMessage(
          "message" in result && result.message
            ? result.message
            : "Gagal memuat data profile.",
        );
        return;
      }

      const nextFullName = String(result.full_name ?? "");
      const nextPhoneLocal = toLocalPhone(result.phone);

      setFullName(nextFullName);
      setPhoneLocal(nextPhoneLocal);
      setInitialState({
        fullName: nextFullName,
        phoneLocal: nextPhoneLocal,
      });
    } catch {
      setErrorMessage("Terjadi kesalahan saat mengambil data profile.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConfirmation = () => {
    const normalizedFullName = fullName.trim();
    const normalizedPhoneDigits = onlyDigits(phoneLocal);

    setSuccessMessage("");

    if (!normalizedFullName) {
      setErrorMessage("Full name wajib diisi.");
      return;
    }

    if (!normalizedPhoneDigits) {
      setErrorMessage("Phone number wajib diisi.");
      return;
    }

    setErrorMessage("");
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: onlyDigits(phoneLocal),
        }),
      });

      const result = (await response.json()) as
        | SettingsProfileResponse
        | { message?: string };

      if (!response.ok) {
        setErrorMessage(
          "message" in result && result.message
            ? result.message
            : "Gagal menyimpan perubahan.",
        );
        return;
      }

      setSuccessMessage("Perubahan profile berhasil disimpan.");
      setIsConfirmOpen(false);
      await fetchProfile();
      router.refresh();
    } catch {
      setErrorMessage("Terjadi kesalahan saat menyimpan profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Kelola data profile Anda untuk kebutuhan checkout.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Memuat data profile...
          </p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="full-name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone-number" className="text-sm font-medium">
                Phone Number
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70">
                  +62
                </span>
                <Input
                  id="phone-number"
                  value={phoneLocal}
                  onChange={(event) =>
                    setPhoneLocal(onlyDigits(event.target.value))
                  }
                  inputMode="numeric"
                  placeholder="81234567890"
                  className="pl-14"
                />
              </div>
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            {successMessage ? (
              <p className="text-sm text-green-600">{successMessage}</p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={openConfirmation}
                disabled={!hasChanges || isSaving}
              >
                Simpan Perubahan
              </Button>
            </div>
          </div>
        )}
      </section>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan</DialogTitle>
            <DialogDescription>
              Yakin ingin menyimpan perubahan Full Name dan Phone Number?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmSave()}
              disabled={isSaving}
            >
              {isSaving ? "Menyimpan..." : "Ya, Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
