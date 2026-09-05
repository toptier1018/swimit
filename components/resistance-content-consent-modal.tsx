"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { VideoConsentPrivacyList } from "@/components/video-consent";

type ResistanceContentConsentModalProps = {
  open: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ResistanceContentConsentModal({
  open,
  checked,
  onCheckedChange,
  onOpenChange,
  onConfirm,
}: ResistanceContentConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[88dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle className="text-lg leading-7 sm:text-xl">
            촬영 및 콘텐츠 활용 확인
          </DialogTitle>
          <DialogDescription className="break-keep text-sm leading-6">
            저항 진단 프로그램 결제 전에 촬영과 콘텐츠 활용 내용을 한 번 더
            확인해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-4 text-sm leading-6 text-gray-700 sm:text-[15px] sm:leading-7">
            <VideoConsentPrivacyList />

            <p className="break-keep">
              저항 진단 프로그램은 촬영 영상의 일부를 스윔잇 수영 교육 콘텐츠 및
              프로그램 소개 자료로 활용하는 것을 포함하여 운영됩니다.
            </p>
            <p className="break-keep">
              인스타그램, 유튜브, 네이버 카페, 홈페이지 및 온라인 콘텐츠 등에
              게시될 수 있습니다.
            </p>

            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="resistance-payment-content-consent"
                  checked={checked}
                  onCheckedChange={(value) => onCheckedChange(value === true)}
                  className="mt-0.5 size-5 shrink-0"
                />
                <Label
                  htmlFor="resistance-payment-content-consent"
                  className="cursor-pointer break-keep text-sm font-semibold leading-6 text-gray-900"
                >
                  위 내용을 확인했으며 촬영 및 콘텐츠 활용에 동의합니다.
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="safe-area-pb-4 border-t bg-white px-4 py-4 sm:px-6">
          <Button
            type="button"
            className="h-12 w-full text-base font-extrabold"
            disabled={!checked}
            onClick={onConfirm}
          >
            동의하고 계속하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
