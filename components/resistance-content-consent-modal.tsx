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
            촬영 및 콘텐츠 활용 안내
          </DialogTitle>
          <DialogDescription className="break-keep text-sm leading-6">
            회원님의 개인정보 보호를 위해 콘텐츠 활용 시 아래와 같이
            처리합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-4 text-sm leading-6 text-gray-700 sm:text-[15px] sm:leading-7">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
              <ul className="space-y-2 text-blue-950">
                <li className="font-extrabold">• 얼굴은 블러 처리합니다.</li>
                <li className="font-extrabold">
                  • 이름 및 연락처는 공개하지 않습니다.
                </li>
                <li>
                  • 문신 등 개인을 특정할 수 있는 특징은 필요 시 추가 블러
                  처리합니다.
                </li>
                <li>
                  • 개인을 특정할 수 있는 음성 및 정보는 제거합니다.
                </li>
              </ul>
            </div>

            <p className="break-keep">
              저항 진단 프로그램은 수중 촬영 및 분석과 함께, 촬영 영상의 일부를
              스윔잇의 수영 교육 콘텐츠 및 프로그램 소개를 위해 활용할 수
              있습니다.
            </p>
            <p className="break-keep">
              촬영 영상은 스윔잇 공식 인스타그램, 유튜브, 네이버 카페, 홈페이지
              및 온라인 콘텐츠 등에 게시될 수 있습니다.
            </p>
            <p className="break-keep">
              회원님의 신원이 드러나지 않도록 위와 같은 보호 조치를 적용한 후
              활용합니다.
            </p>
            <p className="break-keep font-bold text-gray-950">
              본 프로그램은 위 내용을 확인하고 동의하신 분에 한하여 신청
              가능합니다.
            </p>

            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="resistance-content-consent"
                  checked={checked}
                  onCheckedChange={(value) => onCheckedChange(value === true)}
                  className="mt-0.5 size-5 shrink-0"
                />
                <Label
                  htmlFor="resistance-content-consent"
                  className="cursor-pointer break-keep text-sm font-semibold leading-6 text-gray-900"
                >
                  개인정보 보호 및 촬영 콘텐츠 활용 내용을 확인했으며
                  동의합니다.
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
