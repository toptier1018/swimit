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

const PRIVACY_ITEMS = [
  "얼굴 블러 처리",
  "이름 및 연락처 비공개",
  "필요 시 개인을 특정할 수 있는 특징 추가 블러 처리",
  "개인을 특정할 수 있는 음성 및 정보 제거",
] as const;

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
          <DialogDescription className="sr-only">
            저항 진단 프로그램 결제 전 촬영 및 콘텐츠 활용 동의
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-4 text-sm leading-7 text-gray-700 sm:text-[15px] sm:leading-8">
            <p className="break-keep">
              회원님의 수영 영상은 비슷한 고민을 가진 다른 수영인들에게 도움이
              되는 교육 콘텐츠로 활용될 수 있습니다.
            </p>

            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3.5">
              <p className="mb-2.5 break-keep font-bold text-blue-950">
                콘텐츠 활용 시에는
              </p>
              <ul className="space-y-2 text-blue-950">
                {PRIVACY_ITEMS.map((item) => (
                  <li key={item} className="break-keep font-semibold">
                    • {item}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 break-keep font-bold text-blue-950">
                후 사용합니다.
              </p>
            </div>

            <p className="break-keep">
              촬영 영상은 스윔잇의 수영 교육 및 프로그램 소개를 위해
              인스타그램, 유튜브, 네이버 카페, 홈페이지 등에 활용될 수 있습니다.
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
