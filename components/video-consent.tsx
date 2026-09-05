"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  VIDEO_PRIVACY_BULLETS,
  getVideoConsentCopy,
  type VideoConsentKind,
} from "@/lib/resistance-content-consent";

export function VideoConsentPrivacyList() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
      <p className="mb-2 text-sm font-extrabold text-blue-950">
        개인정보는 이렇게 보호합니다
      </p>
      <ul className="space-y-2 text-sm leading-6 text-blue-950">
        {VIDEO_PRIVACY_BULLETS.map((item) => (
          <li key={item} className="break-keep">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VideoConsentDetail({ kind }: { kind: VideoConsentKind }) {
  const copy = getVideoConsentCopy(kind);

  return (
    <div className="space-y-4 text-sm leading-6 text-gray-700 sm:text-[15px] sm:leading-7">
      <VideoConsentPrivacyList />

      {copy.intro.map((paragraph) => (
        <p key={paragraph} className="break-keep">
          {paragraph}
        </p>
      ))}

      {copy.purposes ? (
        <div>
          <p className="mb-2 break-keep font-semibold text-gray-900">
            촬영된 영상은 다음과 같은 목적으로 활용될 수 있습니다.
          </p>
          <ul className="space-y-1.5">
            {copy.purposes.map((item) => (
              <li key={item} className="break-keep">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {copy.outro.map((paragraph) => (
        <p key={paragraph} className="break-keep">
          {paragraph}
        </p>
      ))}

      <p className="break-keep font-bold text-gray-950">{copy.closing}</p>
    </div>
  );
}

type VideoConsentItemProps = {
  id: string;
  kind: VideoConsentKind;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onOpenDetail: () => void;
  showSummary?: boolean;
};

export function VideoConsentItem({
  id,
  kind,
  checked,
  onCheckedChange,
  onOpenDetail,
  showSummary = false,
}: VideoConsentItemProps) {
  const copy = getVideoConsentCopy(kind);

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 items-start gap-2">
          <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            className="mt-0.5 size-5 border-2 border-gray-400 shadow-md transition-all hover:border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <Label htmlFor={id} className="cursor-pointer text-sm leading-relaxed">
            <span className="font-semibold text-red-500">[필수]</span>{" "}
            {copy.itemTitle}
          </Label>
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-primary hover:no-underline"
          onClick={onOpenDetail}
        >
          보기
        </Button>
      </div>
      {showSummary ? (
        <p className="ml-6 text-xs leading-relaxed text-gray-500">
          {copy.summary}
        </p>
      ) : null}
    </div>
  );
}

type VideoConsentDialogProps = {
  open: boolean;
  kind: VideoConsentKind;
  onOpenChange: (open: boolean) => void;
};

export function VideoConsentDialog({
  open,
  kind,
  onOpenChange,
}: VideoConsentDialogProps) {
  const copy = getVideoConsentCopy(kind);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[88dvh] max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle className="text-lg font-semibold leading-7 sm:text-xl">
            {copy.modalTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          <VideoConsentDetail kind={kind} />
        </div>

        <div className="safe-area-pb-4 border-t bg-white px-4 py-4 sm:px-6">
          <Button
            type="button"
            className="h-12 w-full bg-blue-600 text-base font-extrabold text-white hover:bg-blue-700"
            onClick={() => onOpenChange(false)}
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
