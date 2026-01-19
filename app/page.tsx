"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  User,
  Phone,
  MapPinned,
  MessageSquare,
  Mail,
  X,
  Calendar,
  CreditCard,
  Users,
  Check,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { submitToNotion } from "@/app/actions/notion";

const classes = [
  {
    id: 3,
    location: "서울 서초 인근",
    locationCode: "2.22",
    date: "2월 22일 (일)",
    dateNum: 22,
    month: 2,
    venue: "특강 신청 후 제공됩니다.",
    address: "특강 신청 후 제공됩니다.",
    spots: "3명 모집 중",
  },
];

export default function SwimmingClassPage() {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>("3");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    name: string;
    time: string;
    price: number;
    isWaitlist: boolean;
    available?: boolean; // Added for consistency with updates
  } | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "male",
    location: "", // Changed from 'residence' to 'location' for clarity
    email: "",
    message: "",
  });
  const [agreeAll, setAgreeAll] = useState(false);
  const [agree1, setAgree1] = useState(false); // 개인정보 수집
  const [agree2, setAgree2] = useState(false); // 서비스 이용약관
  const [agree4, setAgree4] = useState(false); // 취소
  const [agree5, setAgree5] = useState(false); // 환불
  const [agree6, setAgree6] = useState(false); // 수영 활동 안전 및 면책
  const [agree7, setAgree7] = useState(false); // 영상촬영
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false); // Added cancellation notice modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistClass, setWaitlistClass] = useState<{
    name: string;
    time: string;
    type: string;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("card");
  const [finalAgree, setFinalAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // 달력 월 상태 추가 (선택된 클래스의 월로 초기화)
  const getCurrentYear = () => new Date().getFullYear();
  const getCurrentMonth = () => new Date().getMonth() + 1;
  const getCurrentDay = () => new Date().getDate();

  const [calendarMonth, setCalendarMonth] = useState(2); // 2월로 초기화
  const calendarYear = 2026; // 2026년으로 초기화

  // selectedClass가 변경되면 달력 월도 업데이트
  useEffect(() => {
    if (selectedClass) {
      const selectedClassData = classes.find(
        (c) => c.id === Number(selectedClass)
      );
      if (selectedClassData) {
        setCalendarMonth(selectedClassData.month);
        console.log(
          `[v0] 선택된 클래스 변경: ${selectedClassData.location}, 월: ${selectedClassData.month}`
        );
      }
    }
  }, [selectedClass]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const monthNames = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "");

    // 최대 11자리까지만 허용
    const limitedNumbers = numbers.slice(0, 11);

    // 길이에 따라 하이픈 추가
    if (limitedNumbers.length <= 3) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 6) {
      // 4~6자리: 010-123 형식
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
    } else if (limitedNumbers.length <= 10) {
      // 7~10자리: 010-123-4567 형식 (3-3-4)
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(
        3,
        6
      )}-${limitedNumbers.slice(6)}`;
    } else {
      // 11자리: 010-1234-5678 형식 (3-4-4)
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(
        3,
        7
      )}-${limitedNumbers.slice(7)}`;
    }
  };

  // 오늘 날짜 정보
  const today = {
    year: getCurrentYear(),
    month: getCurrentMonth(),
    day: getCurrentDay(),
  };

  // Create calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // 현재 달력 월의 모든 특강 날짜를 highlightedDates에 포함
  const highlightedDates = classes
    .filter((c) => c.month === calendarMonth)
    .map((c) => c.dateNum);

  const handleRegistration = () => {
    setShowRegistrationForm(true);
    setStep(2); // Move to step 2 after selecting a class
  };

  const handleBackToSchedule = () => {
    setShowRegistrationForm(false);
    setStep(1); // Go back to step 1
  };

  useEffect(() => {
    const allChecked = agree1 && agree2 && agree4 && agree5 && agree6 && agree7;
    setAgreeAll(allChecked);
  }, [agree1, agree2, agree4, agree5, agree6, agree7]);

  const handleAgreeAll = (checked: boolean) => {
    setAgreeAll(checked);
    setAgree1(checked);
    setAgree2(checked);
    setAgree4(checked);
    setAgree5(checked);
    setAgree6(checked);
    setAgree7(checked);
  };

  const handleSubmit = () => {
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <main className="container mx-auto py-8 px-4 max-w-5xl">
        {!showRegistrationForm ? (
          <>
            {/* Class Information Section */}
            <Card className="mb-6 bg-blue-50/50 border-blue-100">
              <CardContent className="p-6">
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                  {/* Main Title */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      단 하루만에 수영 편하게 하는 방법이 있다면 믿으시겠습니까?
                    </h3>
                  </div>

                  {/* Problem Section */}
                  <div className="space-y-3">
                    <p>
                      수영을 가르치는 기관에서는 많은 분들을 한번에 가르쳐야 하기
                      때문에
                    </p>
                    <p>
                      <span className="font-bold">
                        개인의 문제 해결에 집중하기 보단 짜여진 커리큘럼과
                        개별 피드백 없이 강습할 수 밖에 없습니다
                      </span>
                    </p>
                    <p>
                      결국 내 문제를 빠르고 쉽게 해결하지 못해 실력이 늘지 않고
                      재미도 없어 수영을 포기하게 됩니다
                    </p>
                    <p>
                      게다가 물의 밀도는 공기보다 800배 크기 때문에{" "}
                      <span className="font-bold">
                        잘못된 방식으로 수영을 지속하게 되면 어깨, 허리, 무릎
                        통증에 시달리게 되는 것이죠
                      </span>
                    </p>
                    <p className="font-bold">
                      건강하려고 시작했던 수영이 통증을 유발시키는 수영이 되면
                      안되잖아요?
                    </p>
                  </div>

                  {/* Solution Section */}
                  <div className="space-y-3">
                    <p>
                      "스윔잇"은 이 문제를 해결하기 위해{" "}
                      <span className="font-bold text-lg">
                        "다치지 않고 오래돌 수 있는 수영"
                      </span>{" "}
                      특강을 개최했습니다
                    </p>
                    <p>
                      스윔잇 강의와 연결된 선수/강사 경력 10년 이상 되는
                      배테랑 분들이 잘못된 방법으로 하고 계신 수영을 손수
                      잡아드립니다
                    </p>
                    <p>
                      즉,{" "}
                      <span className="font-bold">
                        "하루만에 편하게 수영하는 방법에 대해서 직접 잡아드리는
                        원데이 특강"
                      </span>
                      입니다
                    </p>
                    <p>
                      아래 선생님들 프로필을 보시면 최강의 선생님들로
                      구성되었다는 걸 알 수 있죠
                    </p>
                  </div>

                  {/* Pricing Section */}
                  <div className="space-y-3">
                    <p>
                      첫 특강은 2시간에 10만원에서 할인된 가격{" "}
                      <span className="font-bold">40%할인된 가격인 6만원</span>으로
                      책정하였습니다
                    </p>
                    <p>
                      이 가격으로 영상 촬영에 담당 강사분께서 직접 피드백까지
                      하는 보너스까지 꾹꾹 눌러 담아 알차게 구성하였습니다
                    </p>
                    <p className="text-xs text-gray-600">
                      (강습 시간상 쉬는 시간에 촬영해야 하므로 선착순으로
                      원하시는 분들만 촬영합니다)
                    </p>
                  </div>

                  {/* Call to Action */}
                  <div>
                    <p className="font-bold">
                      야심차게 준비한 스윔잇 특강{" "}
                      <span className="font-bold">지금 바로 신청하기</span>를 눌러
                      여러분의 문제를 해결해보세요
                    </p>
                  </div>

                  {/* PS Section */}
                  <div className="mt-4">
                    <p className="text-sm text-red-600 font-semibold">
                      PS. 해당 강습은 가격이 계속 오를 예정이므로 마감이
                      되었다면 일정에 <span className="font-bold">예약하기</span>를
                      눌러서 오르지 않는 가격으로 선점하시길 바랍니다
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Section */}
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="ml-2">
                <h3 className="font-bold text-red-900 mb-3">⚠️ 주의사항</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    • 단 한번의 특강으로 모든 문제가 해결되진 않습니다.
                    한번에 수강으로 모든게 바뀌길 원하신다면 강습을 신청하지
                    말아주세요.
                  </li>
                  <li>
                    다만, 어떤 문제인지 확실하게 알게 되시며 개인 교정과 연습에
                    따라 수영실력이 빠르게 좋아질 수 있습니다.
                  </li>
                  <li>
                    • 설명이 더 많이 필요한 특강의 특성상 평소 운동량보다 적을
                    수 있습니다.
                  </li>
                  <li>
                    • 본 특강은 만 19세 미만 미성년자는 참여할 수 없습니다.
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Refund Policy Section */}
            <Alert className="mb-6 bg-yellow-50 border-yellow-200">
              <HelpCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="ml-2">
                <h3 className="font-bold text-yellow-900 mb-2">
                  💬 특강 관련 문의
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  특강에 대해 궁금한 점이 있으신가요? 카카오톡으로 편하게
                  문의해주세요!
                </p>
                <Button
                  size="sm"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={() =>
                    window.open("https://pf.kakao.com/_dXUgn/chat", "_blank")
                  }
                >
                  ☎️ 카카오톡 문의하기
                </Button>
              </AlertDescription>
            </Alert>

            {/* Action Button (hidden when showRegistrationForm is true) */}
            <div className="mt-8">
              <Button
                onClick={handleRegistration}
                className="w-full py-6 text-lg font-semibold"
                size="lg"
              >
                지금 바로 신청하기 →
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-8 flex items-center justify-center gap-4">
              {/* Step 1 */}
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step > 1
                      ? "bg-green-500 text-white"
                      : step === 1
                      ? "bg-primary text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step > 1 ? "✓" : "1"}
                </div>
                <span className="ml-2 text-sm font-medium">선택</span>
              </div>

              <div className="w-12 h-0.5 bg-gray-300" />

              {/* Step 2 */}
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step > 2
                      ? "bg-green-500 text-white"
                      : step === 2
                      ? "bg-primary text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step > 2 ? "✓" : "2"}
                </div>
                <span className="ml-2 text-sm font-medium">개인 정보 입력</span>
              </div>

              <div className="w-12 h-0.5 bg-gray-300" />

              {/* Step 3 */}
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step > 3
                      ? "bg-green-500 text-white"
                      : step === 3
                      ? "bg-primary text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step > 3 ? "✓" : "3"}
                </div>
                <span className="ml-2 text-sm font-medium">결제</span>
              </div>

              <div className="w-12 h-0.5 bg-gray-300" />

              {/* Step 4 */}
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 4
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step === 4 ? "✓" : "4"}
                </div>
                <span className="ml-2 text-sm font-medium">완료</span>
              </div>
            </div>

            {step === 2 ? (
              <>
                {/* Step 2: Registration Form */}
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                    <div className="bg-primary/10 p-2 rounded">
                      <svg
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    개인정보 입력
                  </h1>
                </div>

                {/* Registration Form */}
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <User className="h-4 w-4" />
                        이름 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="실명을 입력해주세요 (한글만 가능)"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>

                    {/* Phone Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <Phone className="h-4 w-4" />
                        전화번호 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        placeholder="010-1234-5678"
                        value={formData.phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setFormData({ ...formData, phone: formatted });
                          console.log(
                            `[v0] 전화번호 입력: ${e.target.value} -> ${formatted}`
                          );
                        }}
                      />
                    </div>

                    {/* Gender Field */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-1">
                        <User className="h-4 w-4" />
                        성별 <span className="text-red-500">*</span>
                      </Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(value) =>
                          setFormData({ ...formData, gender: value })
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="male" />
                          <Label
                            htmlFor="male"
                            className="font-normal cursor-pointer"
                          >
                            남성
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="female" />
                          <Label
                            htmlFor="female"
                            className="font-normal cursor-pointer"
                          >
                            여성
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Location Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="location"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <MapPinned className="h-4 w-4" />
                        거주 지역 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="location"
                        placeholder="예시: 서울 강남구 / 부산 해운대구"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <Mail className="h-4 w-4" />
                        이메일 (특강/ 수영 제품 할인 정보를 제공합니다)
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="예시: swimit@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          console.log("[v0] 이메일 입력:", e.target.value);
                          setFormData({ ...formData, email: e.target.value });
                        }}
                      />
                    </div>

                    {/* Message Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="message"
                        className="text-sm font-semibold flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        이건 꼭 배우고 싶어요
                      </Label>
                      <Textarea
                        id="message"
                        rows={4}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                      />
                    </div>

                    {/* Required Agreements */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <h4 className="font-semibold">필수 동의 사항</h4>
                      </div>

                      <div className="space-y-4">
                        {/* Agree All */}
                        <div className="flex items-start gap-2 pb-3 border-b border-yellow-200">
                          <Checkbox
                            id="agree-all"
                            checked={agreeAll}
                            onCheckedChange={(checked) =>
                              handleAgreeAll(checked as boolean)
                            }
                            className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                          />
                          <Label
                            htmlFor="agree-all"
                            className="text-sm font-medium cursor-pointer leading-relaxed"
                          >
                            전체 동의
                          </Label>
                        </div>

                        {/* Individual Consents */}
                        <div className="space-y-4">
                          {/* 1. 개인정보 수집 및 이용 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-1"
                                  checked={agree1}
                                  onCheckedChange={(checked) =>
                                    setAgree1(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-1"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  개인정보 수집 및 이용 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowPrivacyModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              수업 관리 목적 외 다른 용도로 사용되지 않으며,
                              개인정보보호법에 따라 안전하게 관리됩니다.
                            </p>
                          </div>

                          {/* 2. 서비스 이용약관 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-2"
                                  checked={agree2}
                                  onCheckedChange={(checked) =>
                                    setAgree2(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-2"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  서비스 이용약관 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowTermsModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              수업 관리 목적 외 서비스 이용약관 필수 가능 약관에
                              동의합니다.
                            </p>
                          </div>

                          {/* 3. 수영 강의 영상촬영 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-7"
                                  checked={agree7}
                                  onCheckedChange={(checked) =>
                                    setAgree7(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-7"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  수영 강의 영상촬영 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowVideoModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              촬영된 영상은 및 교육정보조절로 가능 일정변경도
                              원석되합니다.
                            </p>
                          </div>

                          {/* 4. 수영 활동 안전 및 면책 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-6"
                                  checked={agree6}
                                  onCheckedChange={(checked) =>
                                    setAgree6(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-6"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  수영 활동 안전 및 면책 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowSafetyModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              수영 활동 중 부주의 및 수영 사건을 대한 책임은
                              소지하지 않습니다.
                            </p>
                          </div>

                          {/* 5. 취소 및 환불약관 동의 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-4"
                                  checked={agree4}
                                  onCheckedChange={(checked) =>
                                    setAgree4(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-4"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  취소 및 환불약관 동의
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowRefundModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              환불 규정에 따라 수업 시작 전 취소 시 전액 환불,
                              이후 환불은 약관에 따릅니다.
                            </p>
                          </div>

                          {/* 6. 강의 취소 가능성 안내 */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-2">
                                <Checkbox
                                  id="agree-5"
                                  checked={agree5}
                                  onCheckedChange={(checked) =>
                                    setAgree5(checked as boolean)
                                  }
                                  className="mt-0.5 size-5 border-2 border-gray-400 data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-md hover:border-primary transition-all"
                                />
                                <Label
                                  htmlFor="agree-5"
                                  className="cursor-pointer text-sm leading-relaxed"
                                >
                                  <span className="text-red-500 font-semibold">
                                    [필수]
                                  </span>{" "}
                                  강의 취소 가능성 안내
                                </Label>
                              </div>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-primary hover:no-underline"
                                onClick={() => setShowCancellationModal(true)}
                              >
                                보기
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 ml-6 leading-relaxed">
                              날씨, 수업장 사정 등에 따라 수업 취소 시 전액 환불
                              및 일정 변경 후 적용됩니다.
                            </p>
                          </div>

                          {/* 7. 강사 자격 기준정 안내 (removed as not in image) */}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleBackToSchedule}
                  >
                    ← 이전
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      // Validate form data and all agreements
                      const isKorean = /^[가-힣]+$/.test(formData.name);
                      const isPhone010 = formData.phone.startsWith("010");

                      if (!isKorean) {
                        console.log(
                          "[v0] 유효성 검사 실패: 이름이 한글이 아님",
                          formData.name
                        );
                        toast({
                          title: "입력 오류",
                          description: "이름은 한글로만 입력해주세요.",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (!isPhone010) {
                        console.log(
                          "[v0] 유효성 검사 실패: 전화번호가 010으로 시작하지 않음",
                          formData.phone
                        );
                        toast({
                          title: "입력 오류",
                          description: "전화번호는 010으로 시작해야 합니다.",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (
                        formData.name &&
                        formData.phone &&
                        formData.gender &&
                        formData.location &&
                        agreeAll
                      ) {
                        setIsSubmitting(true);
                        console.log("[폼 제출] 데이터 전송 시작:", formData);

                        try {
                          const result = await submitToNotion(formData);

                          if (result.success) {
                            console.log("[폼 제출] Notion 저장 성공");
                            setStep(3);
                          } else {
                            console.error(
                              "[폼 제출] Notion 저장 실패:",
                              result.error
                            );
                            toast({
                              title: "저장 실패",
                              description:
                                result.error ||
                                "데이터 저장 중 오류가 발생했습니다.",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error("[폼 제출] 예외 발생:", error);
                          toast({
                            title: "오류 발생",
                            description:
                              "예기치 않은 오류가 발생했습니다. 다시 시도해주세요.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }
                    }}
                    disabled={
                      !formData.name ||
                      !formData.phone ||
                      !formData.location ||
                      !agreeAll ||
                      isSubmitting
                    }
                  >
                    {isSubmitting ? "저장 중..." : "클래스 신청하기 →"}
                  </Button>
                </div>
              </>
            ) : step === 3 ? (
              <>
                {/* Step 3: Payment */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>📋</span> 클래스 상세 안내
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 자유형 클래스 */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <span>🏊</span> 자유형 클래스
                      </h4>
                      <div className="space-y-1 text-sm ml-6">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>자유형 A: 자유형 25m 이상 가능하신 분</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            자유형 B: 자유형 50m 가능 / 수영 경력 6개월 이상
                          </span>
                        </div>
                        <p className="text-xs text-red-500 mt-2 ml-6">
                          ※ 연속 수강 시 개인 실력에 맞춰 단계별로 지도합니다.
                        </p>
                      </div>
                    </div>

                    {/* 평영 클래스 */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <span>🐸</span> 평영 클래스
                      </h4>
                      <div className="space-y-1 text-sm ml-6">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>평영 A: 평영으로 50m 이상 가능하신 분</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            평영 B: 평영 100m 가능 / 수영 경력 1년 이상
                          </span>
                        </div>
                        <p className="text-xs text-red-500 mt-2 ml-6">
                          ※ 연속 수강 시 개인 실력에 맞춰 단계별로 지도합니다.
                        </p>
                      </div>
                    </div>

                    {/* 접영 클래스 */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <span>🦋</span> 접영 클래스
                      </h4>
                      <div className="space-y-1 text-sm ml-6">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            접영 A: 접영·배영·평영·자유형을 모두 배워보았으나
                            <br />
                            &emsp;&emsp;접영 동작이 아직 어려우신 분
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            접영 B: 접영 50m 가능 / 수영 경력 1년 이상
                          </span>
                        </div>
                        <p className="text-xs text-red-500 mt-2 ml-6">
                          ※ 연속 수강 시 개인 실력에 맞춰 단계별로 지도합니다.
                        </p>
                      </div>
                    </div>

                    {/* 카카오톡 문의 */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        궁금한 점이 있으시면 카카오톡으로 문의해주세요!
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-yellow-400 hover:bg-yellow-500 border-0"
                        onClick={() =>
                          window.open(
                            "https://pf.kakao.com/_dXUgn/chat",
                            "_blank"
                          )
                        }
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        카카오톡 문의하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Title */}
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                    <div className="bg-primary/10 p-2 rounded">
                      <svg
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="16"
                          rx="2"
                          strokeWidth="2"
                        />
                        <path d="M3 10h18" strokeWidth="2" />
                      </svg>
                    </div>
                    특강 날짜와 지역을 선택하세요
                  </h1>
                </div>

                {/* Two Column Layout */}
                <div className="grid md:grid-cols-[300px_1fr] gap-6 mb-8">
                  {/* Left: Calendar */}
                  <div>
                    <Card>
                      <CardContent className="p-4">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-semibold text-primary">
                              📅 수강 일정 달력
                            </h3>
                          </div>
                        </div>

                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newMonth =
                                calendarMonth > 1 ? calendarMonth - 1 : 12;
                              setCalendarMonth(newMonth);
                              console.log(`[v0] 달력 월 변경: ${newMonth}월`);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold">
                            {calendarYear}년 {monthNames[calendarMonth - 1]}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newMonth =
                                calendarMonth < 12 ? calendarMonth + 1 : 1;
                              setCalendarMonth(newMonth);
                              console.log(`[v0] 달력 월 변경: ${newMonth}월`);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {weekDays.map((day, i) => (
                            <div
                              key={day}
                              className={`text-center text-xs font-medium py-1 ${
                                i === 0
                                  ? "text-red-500"
                                  : i === 6
                                  ? "text-blue-500"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                          {calendarDays.map((day, index) => {
                            const isHighlighted =
                              day && highlightedDates.includes(day);
                            const dayOfWeek = index % 7;
                            // 오늘 날짜인지 확인
                            const isToday =
                              day &&
                              calendarYear === today.year &&
                              calendarMonth === today.month &&
                              day === today.day;

                            return (
                              <div
                                key={index}
                                className="aspect-square flex items-center justify-center"
                              >
                                {day ? (
                                  <button
                                    className={`w-full h-full flex items-center justify-center text-sm rounded-lg transition-colors ${
                                      isHighlighted
                                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                        : isToday
                                        ? "bg-gray-300 text-gray-700 font-medium"
                                        : dayOfWeek === 0
                                        ? "text-red-500 hover:bg-muted"
                                        : dayOfWeek === 6
                                        ? "text-blue-500 hover:bg-muted"
                                        : "text-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ) : (
                                  <div />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="mt-4 pt-4 border-t flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            <span>특강 일정</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-gray-300" />
                            <span>오늘</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: Class List */}
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-primary">
                        📍 지역 선택
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {classes.map((classItem) => (
                        <Card
                          key={classItem.id}
                          className={`cursor-pointer transition-all ${
                            selectedClass === String(classItem.id)
                              ? "bg-primary/5 border-primary border-2 shadow-md"
                              : "hover:border-primary/30 hover:shadow-sm"
                          }`}
                          onClick={() => {
                            setSelectedClass(String(classItem.id));
                          }}
                        >
                          <CardContent className="p-4">
                            {/* Location Header */}
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-blue-500 fill-blue-500/10" />
                                <span className="font-bold text-lg">
                                  {classItem.location} ({classItem.locationCode}
                                  )
                                </span>
                              </div>
                              {selectedClass === String(classItem.id) && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>

                            {/* Date Section - Blue Box */}
                            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <span className="font-bold text-lg text-blue-900">
                                  {classItem.date}
                                </span>
                              </div>
                              <p className="text-sm text-blue-600 font-medium ml-7">
                                수영 특강 일정
                              </p>
                            </div>

                            {/* Details Section */}
                            <div className="space-y-3">
                              <div className="flex items-start gap-4">
                                <span className="text-sm font-bold text-gray-900 min-w-[45px]">
                                  수영장
                                </span>
                                <span className="text-sm text-gray-600">
                                  {classItem.venue}
                                </span>
                              </div>
                              <div className="flex items-start gap-4 relative">
                                <span className="text-sm font-bold text-gray-900 min-w-[45px]">
                                  주소
                                </span>
                                <div className="flex-1 flex items-center justify-between gap-2">
                                  <span className="text-sm text-gray-600 leading-relaxed">
                                    {classItem.address}
                                  </span>
                                  <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 border rounded px-1.5 py-0.5">
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                                      />
                                    </svg>
                                    복사
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-bold text-green-600">
                                  예약 가능
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="overflow-hidden border-0 shadow-md">
                    <div className="bg-[#2563EB] text-white px-4 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-5 w-5" />
                        <h4 className="font-bold text-lg">
                          수영 클래스 시간표
                        </h4>
                      </div>
                      <p className="text-sm text-blue-100 ml-7">
                        시간대별 수업을 확인하고 선택해주세요
                      </p>
                    </div>
                    <CardContent className="p-0">
                      <div className="flex flex-col w-full overflow-x-auto">
                        {/* 1번특강 Row */}
                        <div className="flex flex-col sm:flex-row">
                          {/* Time Label */}
                          <div className="flex flex-row sm:flex-col justify-center sm:justify-center items-center sm:items-start px-4 sm:px-6 py-4 sm:py-6 bg-[#F8FAFC] w-full sm:w-[180px] border-b sm:border-b-0 sm:border-r border-gray-100 shrink-0">
                            <div className="text-base font-bold text-gray-900 mr-2 sm:mr-0">
                              1번특강
                            </div>
                            <div className="text-sm text-gray-500 sm:mt-1">
                              14:00 ~ 16:00
                            </div>
                          </div>
                          {/* Class Grid for Row 1 */}
                          <div className="flex-1 p-2 sm:p-3 bg-white grid grid-cols-5 gap-2 sm:gap-3">
                            {[
                              {
                                name: "자유형 A (초급)",
                                available: true,
                                price: 70000,
                              },
                              {
                                name: "평영 A (초급)",
                                available: true,
                                price: 70000,
                              },
                              {
                                name: "접영 A (초급)",
                                available: true,
                                price: 70000,
                              },
                              {
                                name: "자유형 B (중급)",
                                available: true,
                                price: 70000,
                              },
                              {
                                name: "평영 B (중급)",
                                available: true,
                                price: 70000,
                              },
                            ].map((slot, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSelectedTimeSlot({
                                    name: slot.name,
                                    time: "14:00 ~ 16:00",
                                    price: slot.price,
                                    isWaitlist: false,
                                    available: true,
                                  });
                                }}
                                className={`relative border rounded-lg p-2 sm:p-4 flex flex-col justify-between min-h-[80px] sm:min-h-[100px] transition-all ${
                                  selectedTimeSlot?.name === slot.name &&
                                  selectedTimeSlot?.time === "14:00 ~ 16:00"
                                    ? "border-primary border-2 ring-2 ring-primary/10 bg-primary/5"
                                    : "border-gray-200 hover:border-primary/50 hover:shadow-sm bg-white"
                                }`}
                              >
                                <div className="text-[10px] sm:text-sm font-bold text-gray-800 break-words leading-tight">
                                  {slot.name}
                                </div>
                                <div className="flex justify-end mt-1 sm:mt-2">
                                  <span className="bg-[#10B981] text-white text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold">
                                    신청가능
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Header */}
                  <div className="text-center py-6 border-t">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <span className="text-2xl">💳</span>
                      <h2 className="text-2xl font-bold">결제하기</h2>
                    </div>
                    <p className="text-sm text-gray-600">
                      안전한 결제 시스템으로 강의를 신청하세요
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Column - Payment Method */}
                    <div className="space-y-6">
                      {/* Payment Method Selection */}
                      <div>
                        <h3 className="text-lg font-bold mb-4">결제 방법</h3>

                        <div className="space-y-3">
                          {/* Payment Method Buttons Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setPaymentMethod("kakao")}
                              className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all relative ${
                                paymentMethod === "kakao"
                                  ? "border-primary bg-blue-50"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              {paymentMethod === "kakao" && (
                                <div className="absolute top-2 left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                              <div className="text-2xl">💛</div>
                              <span className="text-sm font-medium">
                                카카오페이
                              </span>
                            </button>

                            <button
                              onClick={() => setPaymentMethod("tosspayments")}
                              className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                                paymentMethod === "tosspayments"
                                  ? "border-primary bg-blue-50"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              <div className="text-2xl text-blue-600">💳</div>
                              <span className="text-sm font-medium">
                                토스페이먼츠
                              </span>
                            </button>

                            <button
                              onClick={() => setPaymentMethod("card")}
                              className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                                paymentMethod === "card"
                                  ? "border-primary bg-blue-50"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              <CreditCard className="h-8 w-8 text-gray-600" />
                              <span className="text-sm font-medium">
                                신용·체크카드
                              </span>
                            </button>

                            <button
                              onClick={() => setPaymentMethod("naverpay")}
                              className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                                paymentMethod === "naverpay"
                                  ? "border-primary bg-blue-50"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center">
                                <span className="text-white font-bold">N</span>
                              </div>
                              <span className="text-sm font-medium">
                                네이버페이
                              </span>
                            </button>
                          </div>

                          {/* Bottom Row - 2 Payment Options */}
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setPaymentMethod("paypal")}
                              className={`border-2 rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${
                                paymentMethod === "paypal"
                                  ? "border-primary bg-blue-50"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center">
                                <span className="text-xs font-bold">pay</span>
                              </div>
                              <span className="text-sm font-medium">
                                페이팔
                              </span>
                            </button>

                            <button
                              onClick={() => setPaymentMethod("toss")}
                              className={`border-2 rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${
                                paymentMethod === "toss"
                                  ? "border-primary bg-blue-50"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xs">
                                  t
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                토스페이
                              </span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-red-500 mt-3">
                          * 주로 호 기한 안내 담임께서 결제는 우선이 수정됩니다.
                        </p>
                      </div>

                      {/* Installment Options */}
                      <div>
                        <h3 className="text-base font-semibold mb-3">
                          할부 개월 정보
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          <select className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                            <option>온행 선택</option>
                            <option>국민</option>
                            <option>신한</option>
                            <option>삼성</option>
                          </select>
                          <Input
                            placeholder="예금주 입력"
                            className="border-gray-300"
                          />
                          <Input
                            placeholder="계좌번호 입력(※ 제외)"
                            className="border-gray-300"
                          />
                        </div>

                        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                          주문금액을 위는 결제 방법을 사용하 개별로 결제할 수
                          있습니다.
                        </p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          삼성 할부는 - 5/6개월 이상 결제 시 1000원 수수료가!
                        </p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          신용카드는 무이자 할부 여부 &gt;
                        </p>
                      </div>

                      {/* Agreement Checkbox */}
                      <div className="flex items-start gap-2 py-2">
                        <Checkbox
                          id="payment-terms"
                          checked={finalAgree}
                          onCheckedChange={(checked) =>
                            setFinalAgree(checked as boolean)
                          }
                          className="mt-1 size-5 border-2 border-gray-400"
                        />
                        <Label
                          htmlFor="payment-terms"
                          className="text-sm cursor-pointer"
                        >
                          [필수] 결제 서비스 이용약관, 개인정보 처리 동의 &gt;
                        </Label>
                      </div>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="space-y-6">
                      {/* Order Summary */}
                      <div>
                        <h3 className="text-lg font-bold mb-4">주문 요약</h3>
                        <div className="space-y-2.5 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <span className="text-gray-700">
                              {classes.find(
                                (c) => String(c.id) === selectedClass
                              )?.location || "정보 없음"}{" "}
                              (
                              {classes.find(
                                (c) => String(c.id) === selectedClass
                              )?.locationCode || ""}
                              )
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">
                              {selectedTimeSlot?.time.split("(")[0] ||
                                "날짜 정보 없음"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-700">어른</span>
                          </div>
                        </div>
                      </div>

                      {/* Selected Class */}
                      <div>
                        <h3 className="text-lg font-bold mb-3">
                          선택된 클래스
                        </h3>
                        <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                          {selectedTimeSlot ? (
                            <div>
                              <p className="text-sm font-medium text-gray-800 mb-1">
                                {selectedTimeSlot.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                시간대: 1번특강 ({selectedTimeSlot.time})
                              </p>
                              {selectedTimeSlot.isWaitlist && (
                                <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                  대기신청
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-sm text-gray-500 mb-1">
                                아직 클래스를 선택하지 않았습니다
                              </p>
                              <p className="text-xs text-gray-400">
                                위 시간표에서 클래스를 선택해주세요
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold">총 결제 금액</h3>
                          <span className="text-2xl font-bold text-primary">
                            ₩
                            {selectedTimeSlot
                              ? selectedTimeSlot.price.toLocaleString()
                              : 0}
                          </span>
                        </div>

                        {selectedTimeSlot &&
                          !selectedTimeSlot.isWaitlist &&
                          selectedTimeSlot.available && (
                            <div className="mb-3 space-y-1">
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>원가</span>
                                <span className="line-through">₩100,000</span>
                              </div>
                              <div className="flex justify-between text-sm text-red-600 font-semibold">
                                <span>할인</span>
                                <span>-₩30,000</span>
                              </div>
                            </div>
                          )}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="text-blue-600 mt-0.5">
                              <svg
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <p className="text-xs text-blue-800 leading-relaxed">
                              {selectedTimeSlot?.isWaitlist
                                ? "대기 신청은 무료입니다"
                                : "결제 후 즉시 영상 등록이 완료됩니다"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <div className="text-green-600 mt-0.5">
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-green-800 mb-1">
                          안전한 결제
                        </h4>
                        <p className="text-xs text-green-700 leading-relaxed">
                          SSL 암호화 통신과 PG사 인증을 통해 안전하게
                          보호됩니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="px-8 border-gray-300 text-gray-700 bg-transparent"
                      onClick={() => setStep(2)}
                    >
                      ← 이전
                    </Button>
                    <Button
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                      disabled={!selectedTimeSlot || !finalAgree}
                      onClick={() => setStep(4)}
                    >
                      ₩
                      {selectedTimeSlot
                        ? selectedTimeSlot.price.toLocaleString()
                        : "0"}{" "}
                      결제하기
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}
      </main>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              개인정보 수집 및 이용 동의
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowPrivacyModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-base mb-2">
                1. 개인정보의 수집 및 이용 목적
              </h3>
              <p className="text-gray-600 mb-2">
                탑투(주)(이하 "회사")는 다음의 목적을 위하여 개인정보를 수집하고
                이용합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수영 강의 예약 및 관리</li>
                <li>수강생 본인 확인 및 연락</li>
                <li>수업 일정 변경 및 취소 안내</li>
                <li>서비스 관련 중요 공지사항 전달</li>
                <li>고객 문의 및 불만 처리</li>
                <li>통계 분석 및 서비스 개선</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                2. 수집하는 개인정보 항목
              </h3>
              <p className="text-gray-600 mb-2">
                회사는 예약 서비스 제공을 위해 다음과 같은 개인정보를
                수집합니다:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [필수 항목]
                  </p>
                  <p className="text-gray-600">
                    이름, 휴대폰 번호, 성별, 거주 지역, 수영 경력, 수강 목적
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [선택 항목]
                  </p>
                  <p className="text-gray-600">
                    차량번호 (주차 지원 시), 이메일 (추가 정보 수신 시)
                  </p>
                </div>
                <p className="text-xs text-red-600 font-medium">
                  * 필수 항목을 입력하지 않을 경우 서비스 이용이 제한될 수
                  있습니다.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                3. 개인정보의 보유 및 이용 기간
              </h3>
              <p className="text-gray-600 mb-2">
                회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를
                지체 없이 파기합니다. 단, 다음의 경우에는 해당 기간 동안
                보관합니다:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    전자상거래 등에서의 소비자보호에 관한 법률
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    통신비밀보호법
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>웹사이트 방문 기록: 3개월</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                4. 개인정보의 제3자 제공
              </h3>
              <p className="text-gray-600 mb-3">
                회사는 원칙적으로 고객의 개인정보를 외부에 제공하지 않습니다.
                다만, 다음의 경우는 예외로 합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 mb-4">
                <li>고객이 사전에 동의한 경우</li>
                <li>
                  법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와
                  방법에 따라 수사기관의 요구가 있는 경우
                </li>
                <li>
                  서비스 제공을 위해 필요한 경우 (결제 대행사, 배송업체 등)
                </li>
              </ul>

              <p className="font-semibold text-gray-900 mb-2">
                [제3자 제공 현황]
              </p>
              <div className="border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 border-r font-bold">제공받는 자</th>
                      <th className="p-2 border-r font-bold">제공 목적</th>
                      <th className="p-2 font-bold">제공 항목</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2 border-r">PG사 (결제 대행)</td>
                      <td className="p-2 border-r">결제 처리</td>
                      <td className="p-2">이름, 연락처, 결제 정보</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r">알림톡 발송 업체</td>
                      <td className="p-2 border-r">예약 확인 알림</td>
                      <td className="p-2">이름, 연락처, 예약 정보</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                5. 개인정보의 파기 절차 및 방법
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [파기 절차]
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    이용자가 입력한 정보는 목적 달성 후 내부 방침 및 관련 법령에
                    따라 일정 기간 저장된 후 파기됩니다.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    [파기 방법]
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>
                      전자적 파일 형태: 복구 및 재생이 불가능한 기술적 방법을
                      사용하여 완전 삭제
                    </li>
                    <li>종이 문서: 분쇄기로 분쇄하거나 소각</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                6. 이용자 및 법정대리인의 권리와 행사 방법
              </h3>
              <p className="text-gray-600 mb-2">
                이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 mb-3">
                <li>개인정보 열람 요구</li>
                <li>개인정보 정정·삭제 요구</li>
                <li>개인정보 처리 정지 요구</li>
              </ul>
              <p className="text-gray-600 leading-relaxed bg-blue-50 p-3 rounded-lg">
                권리 행사는 고객센터(
                <span className="font-bold">010-3904-1018</span>) 또는 이메일(
                <span className="font-bold">toptier1018@gmail.com</span>)을 통해
                하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                7. 개인정보 보호책임자
              </h3>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-gray-600">
                <p>
                  <span className="font-bold text-gray-900">이름:</span> 김세란
                </p>
                <p>
                  <span className="font-bold text-gray-900">직책:</span> 총괄
                </p>
                <p>
                  <span className="font-bold text-gray-900">연락처:</span>{" "}
                  010-3904-1018
                </p>
                <p>
                  <span className="font-bold text-gray-900">이메일:</span>{" "}
                  toptier1018@gmail.com
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                8. 개인정보 처리방침 변경
              </h3>
              <p className="text-gray-600 leading-relaxed">
                이 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라
                내용의 추가, 삭제 및 수정이 있을 시에는 변경사항의 시행 3일
                전부터 웹사이트를 통하여 공지할 것입니다.
              </p>
            </div>

            <div className="pt-4 border-t text-xs text-gray-500">
              <p className="font-bold">부칙</p>
              <p>본 방침은 2026년 1월 1일부터 시행됩니다.</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowPrivacyModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              서비스 이용약관
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowTermsModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-base mb-2">제1조 (목적)</h3>
              <p className="text-gray-600 leading-relaxed">
                본 약관은 탑투(주)(이하 "회사")가 제공하는 수영 강의 예약
                서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리,
                의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제2조 (용어의 정의)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  "서비스"란 회사가 제공하는 수영 강의 예약 및 관련 부가
                  서비스를 말합니다.
                </li>
                <li>
                  "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는
                  고객을 말합니다.
                </li>
                <li>"강의"란 회사가 제공하는 수영 교육 프로그램을 말합니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                제3조 (서비스의 제공)
              </h3>
              <p className="text-gray-600 mb-2">
                회사는 다음과 같은 서비스를 제공합니다:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>수영 강의 예약 및 결제 서비스</li>
                <li>강의 일정 안내 및 변경 알림</li>
                <li>수영 관련 정보 제공</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제4조 (서비스 이용)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한
                  연중무휴, 1일 24시간을 원칙으로 합니다.
                </li>
                <li>
                  회사는 시스템 정기점검, 서버 증설 및 교체 등의 사유로 서비스를
                  일시 중단할 수 있으며, 이 경우 사전에 공지합니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제5조 (예약 및 결제)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  강의 예약은 웹사이트를 통해 진행되며, 결제 완료 시 예약이
                  확정됩니다.
                </li>
                <li>
                  결제는 신용카드, 계좌이체 등 회사가 정한 방법으로 진행됩니다.
                </li>
                <li>
                  예약 확정 후 이용자의 연락처로 예약 확인 알림톡이 발송됩니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                제6조 (이용자의 의무)
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  이용자는 정확한 정보를 제공해야 하며, 허위 정보 제공 시 예약이
                  취소될 수 있습니다.
                </li>
                <li>이용자는 강의 시작 30분 전까지 도착해야 합니다.</li>
                <li>이용자는 강사의 안전 지침을 준수해야 합니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제7조 (회사의 의무)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  회사는 안전하고 질 높은 강의를 제공하기 위해 노력합니다.
                </li>
                <li>
                  회사는 이용자의 개인정보를 보호하며, 관련 법령을 준수합니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                제8조 (개인정보 보호)
              </h3>
              <p className="text-gray-600 leading-relaxed">
                회사는 이용자의 개인정보를 보호하기 위해 개인정보보호법 및 관련
                법령을 준수하며, 개인정보처리방침에 따라 이용자의 개인정보를
                처리합니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제9조 (면책)</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  회사는 천재지변, 전쟁, 기타 불가항력으로 인하여 서비스를
                  제공할 수 없는 경우 책임이 면제됩니다.
                </li>
                <li>
                  회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여
                  책임을 지지 않습니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">제10조 (분쟁 해결)</h3>
              <p className="text-gray-600 leading-relaxed">
                서비스 이용과 관련하여 발생한 분쟁은 회사와 이용자 간의 협의를
                통해 해결함을 원칙으로 하며, 협의가 이루어지지 않을 경우 관련
                법령 및 회사 소재지 법원의 관할에 따릅니다.
              </p>
            </div>

            <div className="pt-4 border-t text-xs text-gray-500">
              <p className="font-bold">부칙</p>
              <p>본 약관은 2026년 1월 1일부터 시행됩니다.</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowTermsModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Video Filming Consent Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              수영 강의 영상촬영 동의
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowVideoModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. 촬영 목적</h3>
              <p className="text-gray-600 mb-2">
                회사는 다음의 목적을 위해 수영 강의 영상을 촬영합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수강생의 수영 자세 교정 및 피드백 제공</li>
                <li>강의 품질 향상을 위한 분석 자료</li>
                <li>수강생 본인의 실력 향상 확인을 자료 제공</li>
                <li>교육용 모델 콘텐츠 제작 및 수영 강의 홍보 목적</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. 촬영 방법</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>모든 카메라 및 수영장 곳곳에 카메라를 설치하여 촬영</li>
                <li>강의 진행 중 참사자 동의 시 촬영</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. 영상의 보관 및 이용</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  영상은 수강생 본인의 교육 목적으로만 사용되며, 제3자에게
                  제공되지 않습니다.
                </li>
              </ul>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowVideoModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Swimming Activity Safety and Liability Modal */}
      <Dialog open={showSafetyModal} onOpenChange={setShowSafetyModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              수영 활동 안전 및 면책 동의
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowSafetyModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900 text-xs ml-2">
                ⚠️ 본 동의서는 수영 활동의 안전을 위한 중요한 문서입니다. 수영
                강의 참여 전 반드시 숙지하시기 바랍니다.
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="font-bold text-base mb-2">
                1. 수영 활동의 위험성 인지
              </h3>
              <p className="text-gray-600 mb-3 leading-relaxed">
                수강생은 수영이 다음과 같은 위험을 포함할 수 있음을 충분히
                인지하고 이해합니다:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="font-bold text-blue-900 mb-2 flex items-center gap-1">
                    🌊 수상 활동 관련 위험
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                    <li>익수 및 호흡 곤란</li>
                    <li>수영 중 근육 경련</li>
                    <li>과호흡 및 저체온증</li>
                    <li>수중 시야 확보 어려움으로 인한 충돌</li>
                  </ul>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <p className="font-bold text-indigo-900 mb-2 flex items-center gap-1">
                    🏊 신체 활동 관련 위험
                  </p>
                  <ul className="text-xs text-indigo-700 space-y-1 list-disc pl-4">
                    <li>근육 및 관절 부상</li>
                    <li>미끄러짐으로 인한 낙상</li>
                    <li>과도한 운동으로 인한 탈진</li>
                    <li>기존 건강 상태의 악화 가능성</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                2. 건강 상태 고지 의무
              </h3>
              <p className="text-gray-600 mb-3 leading-relaxed">
                수강생은 다음 사항을 강사에게 반드시 사전에 고지해야 합니다:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-bold text-gray-900 mb-3 text-xs">
                  [필수 고지 사항]
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">
                      심혈관계 질환
                    </p>
                    <p className="text-gray-600 text-[11px]">
                      심장 질환, 고혈압, 부정맥
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">
                      호흡기 질환
                    </p>
                    <p className="text-gray-600 text-[11px]">
                      천식, 폐 질환, 호흡기 알레르기
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">기타 질환</p>
                    <p className="text-gray-600 text-[11px]">
                      당뇨병, 간질, 척추/관절 질환
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-800 text-xs">특이사항</p>
                    <p className="text-gray-600 text-[11px]">
                      최근 수술 이력, 임신 여부, 약물 복용 중
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-red-600 mt-3 font-bold">
                ⚠️ 중요: 건강 상태를 고지하지 않아 발생한 사고에 대해서는 회사가
                책임을 지지 않습니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">3. 안전 수칙 준수</h3>
              <div className="space-y-3">
                {[
                  {
                    title: "준비운동 및 정리운동 참여",
                    desc: "강의 시작 전후 반드시 준비운동과 정리운동에 참여합니다.",
                  },
                  {
                    title: "강사의 안전 지시 이행",
                    desc: "강사의 모든 안전 지침과 주의사항을 즉시 따릅니다.",
                  },
                  {
                    title: "능력 범위 내 활동",
                    desc: "본인의 체력 및 수영 능력 범위 내에서만 활동합니다.",
                  },
                  {
                    title: "이상 증상 즉시 알림",
                    desc: "수영 중 어지러움, 호흡곤란 등 이상 증상 발생 시 즉시 강사에게 알립니다.",
                  },
                  {
                    title: "수영장 규칙 준수",
                    desc: "수영장 내 뛰지 않기, 다이빙 금지 구역 준수 등 수영장 규칙을 지킵니다.",
                  },
                  {
                    title: "음주 후 참여 금지",
                    desc: "음주 상태에서는 절대 수영에 참여하지 않습니다.",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 items-start border-b border-gray-100 pb-2"
                  >
                    <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">
                        {item.title}
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">4. 면책 사항</h3>
              <ul className="space-y-2">
                {[
                  "수강생이 건강 상태를 고지하지 않아 발생한 사고",
                  "수강생이 안전 수칙을 위반하여 발생한 사고",
                  "수강생의 고의 또는 중대한 과실로 인한 사고",
                  "천재지변, 전쟁 등 불가항력적 사유로 인한 사고",
                  "수강생 간 충돌 등 제3자의 행위로 인한 사고",
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-gray-600 text-xs"
                  >
                    <span className="text-gray-300 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">
                5. 회사의 안전 관리 의무
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    👨‍🏫 인력 관리
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>자격증 보유 강사 배치</li>
                    <li>정기적인 안전 교육 실시</li>
                    <li>응급처치 교육 이수</li>
                  </ul>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    🛟 안전 장비
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>구명 장비 구비</li>
                    <li>응급 의료 키트 비치</li>
                    <li>장비 정기 점검 실시</li>
                  </ul>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    📋 매뉴얼 운영
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>응급 상황 대응 매뉴얼</li>
                    <li>사고 보고 체계 구축</li>
                    <li>정기 안전 훈련</li>
                  </ul>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="font-bold text-gray-900 text-xs mb-2 flex items-center gap-1">
                    🏊 시설 관리
                  </p>
                  <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                    <li>수질 정기 검사</li>
                    <li>시설 안전 점검</li>
                    <li>미끄럼 방지 조치</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">6. 긴급 상황 대응</h3>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="font-bold text-red-900 text-xs mb-3 flex items-center gap-1">
                  🚨 긴급 상황 발생 시 행동 요령
                </p>
                <div className="space-y-2 text-[11px] text-red-800">
                  <p>
                    <span className="font-bold">1단계:</span> 즉시 수영을
                    중단하고 안전한 곳으로 이동
                  </p>
                  <p>
                    <span className="font-bold">2단계:</span> 강사 또는 인근
                    스태프에게 즉시 알림
                  </p>
                  <p>
                    <span className="font-bold">3단계:</span> 강사의 지시에 따라
                    행동
                  </p>
                  <p>
                    <span className="font-bold">4단계:</span> 필요시 119 신고
                    (강사가 진행)
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-red-200 space-y-2">
                  <p className="font-bold text-red-900 text-xs flex items-center gap-1">
                    📞 긴급 연락처
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-red-700">
                    <p>수영장 관리실: [수영장별 안내]</p>
                    <p>강사 연락처: [현장 안내]</p>
                    <p>회사 상황실: 010-3904-1018</p>
                    <p>응급 상황: 119</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">7. 보험 안내</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-gray-600">
                <p className="text-[11px] leading-relaxed">
                  회사는 다음과 같은 보험에 가입되어 있습니다:
                </p>
                <ul className="text-[11px] space-y-1 list-disc pl-4 font-medium">
                  <li>시설 배상책임보험: 시설 결함으로 인한 사고 보장</li>
                  <li>강사 배상책임보험: 강사의 과실로 인한 사고 보장</li>
                </ul>
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  * 수강생 개인의 건강 상태나 귀책사유로 인한 사고는 보험 적용
                  대상이 아닙니다. 개인 상해보험 가입을 권장합니다.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">8. 동의 철회</h3>
              <p className="text-gray-600 leading-relaxed">
                본 동의는 수강생이 수영 강의에 참여하는 동안 유효하며, 수강을
                중단할 경우 자동으로 효력이 상실됩니다.
              </p>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
              <p className="font-bold text-primary text-xs mb-2">
                📌 최종 확인 사항
              </p>
              <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                본인은 위의 모든 내용을 충분히 숙지하였으며, 수영 활동의
                위험성을 이해하고 안전 수칙을 준수할 것을 약속합니다. 또한 건강
                상태를 정확히 고지하였으며, 고지하지 않은 사항으로 인한 사고에
                대해서는 본인이 책임질 것을 확인합니다.
              </p>
            </div>

            <div className="pt-2 text-[10px] text-gray-400 border-t flex justify-between items-center">
              <p>본 동의서는 2026년 1월 1일부터 시행됩니다.</p>
              <p className="font-bold">부칙</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowSafetyModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      {/* Cancellation and Refund Policy Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              취소 및 환불 안내
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setShowRefundModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-base mb-2">1. 환불 정책 개요</h3>
              <p className="text-gray-600 leading-relaxed">
                본 정책은 모든 수영 특강 예약 서비스에 적용되며, 특강일 기준으로
                환불 가능 여부가 결정됩니다.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">2. 환불 규정</h3>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <p className="font-bold text-green-900">
                      특강일 3일 전까지
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-700 mb-2">
                    100% 전액 환불 가능
                  </p>
                  <p className="text-xs text-green-600 leading-relaxed">
                    취소 신청 시 등록하신 계좌로 환불 처리됩니다.
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="h-5 w-5 text-red-600" />
                    <p className="font-bold text-red-900">특강일 3일 이내</p>
                  </div>
                  <p className="text-sm font-bold text-red-700 mb-2">
                    환불 불가
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-red-600 font-semibold">
                      [환불 불가 사유]
                    </p>
                    <ul className="text-xs text-red-500 list-disc pl-4">
                      <li>수영장 대관비 확정</li>
                      <li>강사료 확정</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">3. 참석 자격</h3>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <p className="font-bold text-blue-900">본인 참석 원칙</p>
                </div>
                <p className="text-sm text-blue-800 font-semibold mb-2">
                  결제자 본인만 참여 가능
                </p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• 양도 불가</li>
                  <li>• 대리 참석 불가</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">4. 환불 처리 기간</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gray-700" />
                  <p className="font-bold text-gray-900">환불 처리 절차</p>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>취소 신청 후 3-5 영업일 내 환불 처리</li>
                  <li>환불 계좌는 취소 신청 시 등록</li>
                  <li>이체 수수료는 주최자 측에서 부담</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">5. 환불 불가 사유</h3>
              <p className="text-gray-600 mb-2">
                다음의 경우 환불이 불가능합니다:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  특강일 3일 이내 - 수영장 대관비 및 강사료 확정으로 환불 불가
                </li>
                <li>참가자의 무단 불참 (No-show)</li>
                <li>참가자의 개인 사유로 인한 서비스 이용 불가</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">6. 환불 관련 문의</h3>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 space-y-3">
                <p className="font-bold text-yellow-900">취소 및 환불 문의처</p>
                <ul className="space-y-2 text-sm text-yellow-800">
                  <li className="flex items-center gap-2">
                    • 특강 주최자에게 직접 연락
                  </li>
                  <li className="flex items-center gap-2">
                    • 카카오톡 단체 채팅방
                  </li>
                  <li className="flex items-center gap-2">• 커뮤니티 카페</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="font-bold text-gray-900 mb-2">⚠️ 중요 안내</p>
              <ul className="text-xs text-gray-700 space-y-1.5">
                <li>• 특강일 3일 전까지: 100% 환불 가능</li>
                <li>• 양도 및 대리 참석 불가 - 결제자 본인만 참여 가능</li>
                <li>
                  • 해당 내용은 결제페이지 및 신청 안내문에도 동일하게
                  안내됩니다
                </li>
              </ul>
            </div>

            <div className="text-xs text-gray-500 leading-relaxed border-t pt-4">
              <p className="font-bold mb-1">[참고사항]</p>
              <p>
                본 환불 정책은 수영 특강 운영의 특성을 고려하여 수립되었습니다.
                특강 준비를 위한 수영장 대관비 및 강사료는 특강일 3일 전에
                확정되므로, 이후에는 환불이 불가능한 점 양해 부탁드립니다.
              </p>
            </div>

            <div className="pt-2 text-xs text-gray-500">
              <p className="font-bold">부칙</p>
              <p>본 정책은 2026년 1월 1일부터 시행됩니다.</p>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowRefundModal(false)}
          >
            확인
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCancellationModal}
        onOpenChange={setShowCancellationModal}
      >
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              강의 취소 가능성 안내
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-sm">
            {/* 1. 강의 취소 사유 */}
            <div>
              <h3 className="font-semibold mb-2">1. 강의 취소 사유</h3>
              <p className="text-gray-700 mb-2">
                다음과 같이 예측된 강의의 개최가 어려울 수 있습니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>자연 재해로 인한 경우 (폭우 또는 태풍 등 기상 특보)</li>
                <li>수영장 시설 관리 문제로 시설 관리 측에서 요청할 경우</li>
                <li>
                  강사의 개인적인 건강 문제 또는 부득이한 상황 (입원 및 긴급
                  사태 등의 경우)
                </li>
                <li>
                  최소 인원 미달: 낮은 강좌의 경우 진행 여부를 사전에 검토
                </li>
              </ul>
            </div>

            {/* 2. 취소 안내 방법 */}
            <div>
              <h3 className="font-semibold mb-2">2. 취소 안내 방법</h3>
              <p className="text-gray-700 mb-2">
                강의 취소 시, 등록 시 안내드립니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>카카오톡 공개톡 &gt; 톡</li>
                <li>네이버 추가 예약</li>
                <li>단체 전화 (긴급 상황 시)</li>
                <li>
                  가능한 한 빠른 시간 내에 안내드리기 위해 노력하겠습니다.
                </li>
              </ul>
            </div>

            {/* 3. 취소 시 조치 */}
            <div>
              <h3 className="font-semibold mb-2">3. 취소 시 조치</h3>
              <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-1">
                <p className="text-green-800 font-medium">
                  수업료는 다음 중 선택하실 수 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-1 text-green-700 ml-2">
                  <li className="font-medium">
                    전액 환불: 강의의 전액을 환불해 드립니다
                  </li>
                  <li className="font-medium">
                    일정 변경: 다른 가능한 날짜로 수업 일정 변경
                  </li>
                  <li className="font-medium">
                    크레딧 적립: 향후 제공될 강좌에 사용 가능한 크레딧으로 보관
                  </li>
                </ul>
              </div>
            </div>

            {/* 4. 환불 절차 */}
            <div>
              <h3 className="font-semibold mb-2">4. 환불 절차</h3>
              <p className="text-gray-700 mb-2">
                강의 취소로 인한 환불은 다음과 같습니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>전액 신청 시 예약 시기와 같은 금액 환불됩니다</li>
                <li>환불 수수료 없이 전액 환불 가능 합니다</li>
                <li>네이버 수료는 구매 취소</li>
              </ul>
            </div>

            {/* 5. 날짜 변경 */}
            <div>
              <h3 className="font-semibold mb-2">5. 날짜 변경</h3>
              <p className="text-gray-700 mb-2">
                이미 설치된 남편 일정을 대관할 경우 일정
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>화요일 공개면 예모안는 고참선 변경</li>
                <li>나에게 추천 장애이 추가는 학급 추추</li>
                <li>타분 제공은 항목도 및 후 부위 구역도 타입</li>
              </ul>
            </div>

            {/* 6. 보상 정책 */}
            <div>
              <h3 className="font-semibold mb-2">6. 보상 정책</h3>
              <p className="text-gray-700 mb-2">
                반복적인 입장 체취의 발생될 경우:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>추가 무료 연장 세션 제공</li>
                <li>다음 주말 장 정보 시 할인 적용</li>
                <li>저희 과정은 부성 제공</li>
              </ul>
            </div>

            {/* 알림사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-800 font-medium flex items-start gap-2">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <span>알림사항</span>
              </p>
              <p className="text-blue-700 text-xs mt-2 leading-relaxed">
                수업 품질 유지와 안전을 최우선으로 강의 취소 시 신속히 안내해
                드리며 최선을 다해 준비하도록 약속드립니다. 또 모두가 즐거운
                수영 경험을 가질 수 있도록 노력하겠습니다.
              </p>
            </div>

            <p className="text-xs text-gray-500 border-t pt-3">
              본 약관은 수영장의 운영 정책에 따라 주자적은 변동이 없지만, 이해와
              협조를 부탁 드립니다.
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setShowCancellationModal(false)}
              className="w-full bg-primary text-white"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="max-w-md">
          <button
            onClick={() => setShowWaitlistModal(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center space-y-4 pt-6">
            {/* Alarm Icon */}
            <div className="relative">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-12 h-12 text-orange-500"
                >
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2 2" />
                  <path d="M5 3 2 6" />
                  <path d="m22 6-3-3" />
                  <path d="M6 19 4 21" />
                  <path d="m18 19 2 2" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-center">
              대기자로 신청하시겠습니까?
            </h2>

            {/* Selected Class Info */}
            <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                <span className="font-semibold text-gray-900">
                  선택한 클래스
                </span>
              </div>
              <div className="ml-4 space-y-1">
                <p className="font-bold text-gray-900">{waitlistClass?.name}</p>
                <p className="text-sm text-orange-600">
                  {waitlistClass?.time} / {waitlistClass?.type}
                </p>
                <p className="text-sm text-gray-600">정원: 10/10</p>
              </div>
            </div>

            {/* Waitlist Information */}
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">📋</span>
                </div>
                <span className="font-semibold text-gray-900">
                  대기자 신청 안내
                </span>
              </div>
              <ul className="ml-7 space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>클래스는 선착순입니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>정원 초과 시 조기마감되므로 양해부탁드립니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>대기 순서는 신청 순서대로 배정됩니다</span>
                </li>
              </ul>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={() => {
                setShowWaitlistModal(false);
                // Handle waitlist registration here
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 4 - Completion */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Completion Header */}
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <span className="text-3xl">💳</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              가상계좌가 발급되었습니다
            </h2>
            <p className="text-gray-600">
              아래 계좌로 입금하시면 결제가 완료됩니다
            </p>
          </div>

          {/* Virtual Account Information */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="text-blue-600">📋</span>
                가상계좌 입금 정보
              </h3>
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
                입금대기
              </span>
            </div>
            <div className="space-y-2 text-sm bg-white p-3 rounded">
              <div className="flex justify-between">
                <span className="text-gray-600">계좌번호</span>
                <span className="font-medium">790-821510383777</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">예금주</span>
                <span className="font-medium text-red-600">김프레디</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">입금금액</span>
                <span className="font-bold text-lg">₩70,000</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">입금기한</span>
                <span className="text-red-600 font-bold">
                  2025년 1월 22일 오전 6시 44분
                </span>
              </div>
            </div>
          </div>

          {/* Order & Payment Summary */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3 text-sm">주문 및 결제 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">주문번호</span>
                <span className="text-orange-600">WC-785352749</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">주문일시</span>
                <span>2025.11. 오전 4:36:47</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">결제방법</span>
                <span>가상계좌</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">상품 금액</span>
                <span>₩100,000</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>할인 금액</span>
                <span>-₩30,000</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>결제 금액</span>
                <span className="text-cyan-600">₩70,000</span>
              </div>
            </div>
          </div>

          {/* Reservation Information */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3 text-sm">예약자 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">이름</span>
                <span>{formData.name || "김민지"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">연락처</span>
                <span>{formData.phone || "01012345678"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">성별</span>
                <span>{formData.gender === "male" ? "남성" : "여성"}</span>
              </div>
            </div>
          </div>

          {/* Important Notices */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="text-orange-500">⚠️</span>
                입금 안내
              </h3>
              <ul className="text-xs text-gray-700 space-y-1.5 pl-4 list-disc">
                <li>입금자명은 신청자와 같아야 합니다!</li>
                <li>
                  기한 내 미입금시 주문이 자동 취소됩니다 (주문 후 3시간 이내)
                </li>
                <li>입금 확인은 5~10분 정도 소요될 수 있습니다</li>
                <li>계좌번호는 1회성입니다. 반복 사용하실 수 없습니다</li>
                <li>
                  입금 완료 후 자동으로 수업 등록이 진행되며 카톡으로 공지됩니다
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="text-blue-600">💡</span>
                결제 확인 안내
              </h3>
              <p className="text-xs text-gray-700">
                입금이 완료되면 SMS으로 즉시 확인하실 수 있습니다. 입금 완료로
                변경되지 않을 경우 아래 문의로 연락해 주시고 안내 받으시기
                바랍니다. 혹시 연락이 어려우시면 v0.contact로도 연락 가능합니다.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                환불 정책 주의사항
              </h3>
              <ul className="text-xs text-gray-700 space-y-1.5 pl-4 list-disc">
                <li>수업 7일 전 취소 요청시 100% 환불됩니다</li>
                <li>수업 3~6일 전 취소 요청시 70% 환불됩니다</li>
                <li>수업일 3일 전까지는 무료로 환불이 가능합니다</li>
                <li>환불은 결제일 기준으로 수업일까지 기준입니다</li>
                <li>자세한 환불 정책은 이용약관을 확인해주세요</li>
              </ul>
            </div>
          </div>

          <Button
            className="w-full py-6 text-lg font-semibold bg-teal-600 hover:bg-teal-700"
            onClick={() => {
              console.log("[v0] 홈으로 돌아가기 버튼 클릭됨");
              console.log("[v0] 현재 step:", step);

              // 모든 상태를 초기 상태로 리셋
              setStep(1);
              setSelectedDate(null);
              setSelectedClass(null);
              setSelectedTimeSlot(null);
              setShowRegistrationForm(false);
              setFormData({
                name: "",
                phone: "",
                gender: "male",
                location: "",
                email: "",
                message: "",
              });
              setAgreeAll(false);
              setAgree1(false);
              setAgree2(false);
              setAgree4(false);
              setAgree5(false);
              setAgree6(false);
              setAgree7(false);
              setFinalAgree(false);
              setPaymentMethod("card");
              setIsSubmitting(false);

              // 모든 모달 상태 초기화
              setShowSafetyModal(false);
              setShowRefundModal(false);
              setShowPrivacyModal(false);
              setShowTermsModal(false);
              setShowVideoModal(false);
              setShowCancellationModal(false);
              setShowWaitlistModal(false);
              setWaitlistClass(null);

              // 페이지 상단으로 스크롤
              window.scrollTo({ top: 0, behavior: "smooth" });

              console.log(
                "[v0] 모든 상태 초기화 완료 및 페이지 상단으로 스크롤"
              );
            }}
          >
            홈으로 돌아가기
          </Button>
        </div>
      )}
      <footer className="bg-[#1a2332] text-gray-400 py-12 mt-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-white text-xl font-bold">탑투</h3>
              <div className="text-sm space-y-1">
                <p>
                  대표자: <span className="text-gray-300">[장연성]</span>
                </p>
                <p>
                  사업자등록번호:{" "}
                  <span className="text-gray-300">[222-15-92628]</span>
                </p>
                <p>
                  통신판매업 신고번호:{" "}
                  <span className="text-gray-300">[2021-경기송탄-0559]</span>
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-bold">연락처</h3>
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="h-4 w-4" />
                  <p>
                    고객센터: 빠른 상담은 카톡 플러스친구{" "}
                    <span className="text-white font-medium">@스윔잇</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MessageSquare className="h-4 w-4" />
                  <p>
                    이메일:{" "}
                    <span className="text-white">toptier1018@gmail.com</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Policy Links */}
          <div className="border-t border-gray-800 pt-8 mb-8">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              <button
                onClick={() => setShowTermsModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                이용약관
              </button>
              <span className="text-gray-700">|</span>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                개인정보처리방침
              </button>
              <span className="text-gray-700">|</span>
              <button
                onClick={() => setShowRefundModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                환불정책
              </button>
              <span className="text-gray-700">|</span>
              <button
                onClick={() => setShowSafetyModal(true)}
                className="hover:text-white transition-colors text-gray-300"
              >
                안전 및 면책
              </button>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="text-xs space-y-2 text-gray-500">
            <p>© 2026 Swimit, All rights reserved.</p>
            <p>
              본 사이트의 모든 콘텐츠는 저작권법의 보호를 받으며, 무단 전재 및
              복제를 금합니다.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
