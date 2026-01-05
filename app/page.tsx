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
  X,
  Calendar,
  CreditCard,
  Users,
  Check,
  MessageCircle,
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
    id: 1,
    location: "대구",
    locationCode: "1.4",
    date: "1월 4일 (토)",
    dateNum: 4,
    month: 1,
    venue: "대림수영장",
    address: "대구 수성구 / 욱수동 87 대림수",
    spots: "3명 모집 중",
  },
  {
    id: 2,
    location: "안양",
    locationCode: "1.11",
    date: "1월 11일 (토)",
    dateNum: 11,
    month: 1,
    venue: "신세계스포츠",
    address: "경기도 안양시 만안구 / 스포츠 클럽 체육관",
    spots: "3명 모집 중",
  },
  {
    id: 3,
    location: "안양",
    locationCode: "1.31",
    date: "1월 31일 (토)",
    dateNum: 31,
    month: 1,
    venue: "신세계스포츠",
    address: "경기도 안양시 만안구 / 스포츠 클럽 체육관",
    spots: "3명 모집 중",
  },
  {
    id: 4,
    location: "세종",
    locationCode: "2.8",
    date: "2월 8일 (토)",
    dateNum: 8,
    month: 2,
    venue: "세종다이브풀",
    address: "세종 대평동 17 사계리",
    spots: "3명 모집 중",
  },
  {
    id: 5,
    location: "대구",
    locationCode: "2.22",
    date: "2월 22일 (토)",
    dateNum: 22,
    month: 2,
    venue: "대림수영장",
    address: "대구 수성구 / 욱수동 87 대림수 영장",
    spots: "3명 모집 중",
  },
];

export default function SwimmingClassPage() {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
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

  const [calendarMonth, setCalendarMonth] = useState(getCurrentMonth());
  const calendarYear = getCurrentYear();

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
                <h2 className="text-lg font-bold mb-4 text-blue-900">
                  자유형 호흡 특강 상세
                </h2>

                <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                  <div className="space-y-2 mt-4">
                    <p className="font-semibold text-blue-900">
                      자유형 50m도 힘든 수영 초보자가 100m, 200m도 편하게 수영할
                      수 있도록 만들어주는 『자유형 호흡 특강』! 아무리 유튜브
                      영상을 찾아보고, 수영강습을 몇 달 동안해도 숨이 차고
                      어지러운 자유형 호흡 문제는 쉽게 해결되지 않습니다. 머리는
                      알고 있는데 몸이 따라주지 않죠. 저도 처음엔 그랬습니다. 몇
                      달간 시간과 돈을 쓰며 여러 강습을 받았지만, 50m만 가도
                      숨이 차고 물 밖으로 벌떡 일어나야 했어요. 수영은 더이상
                      즐거움이 아니라 고통이었죠. 많은 분들이 • 유튜브 영상 보기
                      • 수영 강습 • 카페, 지식인 을 통해 열정적으로 자유형
                      호흡을 개선하려고 하지만 유튜브 영상은 내 문제를
                      직접적으로 해결해주지 못하고 너무 이론적이고 일반 수영
                      강습은 호흡만 집중적으로 다루지 않으며, 카페와 지식인은
                      답글을 받기도 오래 걸리고 글이라 실제 적용도 힘든 단점이
                      있습니다. 그래서 탄생한 것이 『자유형 호흡 특강』입니다. •
                      2시간꽉채운 특강 • 편한 호흡을 바탕으로 장거리 수영을 하기
                      위한 자유형 영법 교육 워터 클랜즈 자유형 호흡 특강은 →
                      호흡의 원리를 이해하고, 내 몸에 맞는 방식으로 직접 체득해
                      편하게 호흡하며 장거리 수영을 할 수 있게 도와드립니다. 이
                      강의는 수천 명의 일반인 호흡을 교정해온 레전더리
                      강사님들이 직접 진행하며, 일반적인 수영 강습과는 다른 강의
                      전달력과 노하우를 알게 되실겁니다. 2시간 집중 특강 1.
                      자유형 호흡 이론 2. 자유형 영법 교육을 통해 숨쉬기 편한
                      자유형의 변화를 직접 경험하세요! 첫 특강 감사 할인
                      이벤트(안양·대구) 마감 안내 여러분의 뜨거운 관심 덕분에
                      7만원 → 5만원 감사할인 이벤트가 11월 30일부로
                      종료되었습니다.
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
                    • 단 한번의 특강으로 완벽한 자유형을 구사할 수는 없습니다.
                  </li>
                  <li>
                    • 강의는 자유형 호흡 5: 자유형 영법 숙련도 5정도의 비율로
                    수업이 되며 자유형 영법의 개선을 통한 호흡의 안정성, 장거리
                    자유형의 기초를 다지는 특강이 될 겁니다.
                  </li>
                  <li>• 특강 특성상 평소 운동량보다 적을 수 있습니다.</li>
                  <li>
                    •{" "}
                    <span className="font-bold text-red-700">
                      본 특강은 만 19세 미만 미성년자는 참여하실 수 없습니다.
                      성인 대상 커리큘럼으로 구성되어 있는 점 양해 부탁드립니다.
                    </span>
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
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
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
                            className="mt-0.5"
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
                                  className="mt-0.5"
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
                                  className="mt-0.5"
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
                                  className="mt-0.5"
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
                                  className="mt-0.5"
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
                                  className="mt-0.5"
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
                                  className="mt-0.5"
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
                    {/* 평영 기존 */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <span>🤿</span> 평영 기존
                      </h4>
                      <div className="space-y-1 text-sm ml-6">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 A 초급 (자유형 완성고 최소 50미터 가능하신
                            분)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>클래스 B 초중급 (수를 1년이상 -3년)</span>
                        </div>
                      </div>
                    </div>

                    {/* 접영 기존 */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <span>🦋</span> 접영 기존
                      </h4>
                      <div className="space-y-1 text-sm ml-6">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 A 초급 (자유형/배영고, 자유형 완성고 50미터
                            가능하신 분)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>클래스 B 초중급 (수를 1년 6개월 - 3년)</span>
                        </div>
                      </div>
                    </div>

                    {/* 자유형 초등 기존 */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <span>🏊</span> 자유형 초등 기존
                      </h4>
                      <div className="space-y-1 text-sm ml-6">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 입문 A-1 (25m이상 완주 가능하신 분)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 입문 A-2 (25m이상 완주 가능하신분)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 초급 B-1 (25~50m 완주 가능하신분)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 초급 B-2 (25~50m 완주 가능하신분)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 초중급 C-1 (50~100m 완주 가능하신분)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 단 기간 기존 */}
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2">
                        <span>⏱️</span> 단 기간 기존
                      </h4>
                      <div className="space-y-1 text-sm ml-6">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 A 기초반(사이드킥) (사이드 킥 강의 배영로즈
                            엎거나 고중이 특으신 초보분)
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            클래스 B 중급반(사이드&폴릎판) (사이드 & 폴릎 판
                            배워뽐으나 자세 교정이 필으신분)
                          </span>
                        </div>
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
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        카카오톡 문의하기
                      </Button>
                    </div>
                  </CardContent>
                </Card>

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
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                    </div>
                    결제하기
                  </h1>
                  <p className="text-center text-sm text-gray-600 mt-2">
                    안전한 결제 시스템으로 강의를 신청하세요
                  </p>
                </div>

                {/* Price Section */}
                <div className="text-center mb-8 mt-8">
                  <div className="inline-block">
                    <p className="text-2xl text-gray-400 line-through font-medium">
                      ₩100,000
                    </p>
                    <p className="text-4xl text-primary font-bold">₩70,000</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      → (특정 지역과 상황에 따라 변동 될 수 있음)
                    </p>
                  </div>
                </div>

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
                    수영 특강 지역을 선택해주세요
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
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full border-2 border-muted" />
                            <span>일반</span>
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
                            {/* Location Badge */}
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <span className="font-semibold">
                                  {classItem.location} ({classItem.locationCode}
                                  )
                                </span>
                              </div>
                              {selectedClass === String(classItem.id) && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>

                            {/* Date Section */}
                            <div className="bg-primary/10 rounded-lg p-3 mb-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-primary">
                                  {classItem.date}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {classItem.spots}
                              </p>
                            </div>

                            {/* Venue Info */}
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium min-w-[40px]">
                                  수영장
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {classItem.venue}
                                </span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium min-w-[40px]">
                                  주소
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {classItem.address}
                                </span>
                              </div>
                              <button className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                                <MapPin className="h-3 w-3" />
                                예약 가능
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 mb-4">
                      <Calendar className="h-5 w-5" />
                      <h3 className="text-lg font-bold">수영장 시간표</h3>
                    </div>
                  </div>

                  <Card className="bg-primary text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span>📅</span>
                        <h4 className="font-bold">수영 클래스 시간표</h4>
                      </div>
                      <p className="text-sm text-blue-100">
                        시간대를 수업을 확인하고 선택해주세요
                      </p>
                    </CardContent>
                  </Card>

                  {/* Timetable Grid */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px] grid grid-cols-7 gap-2">
                      {/* Time Column */}
                      <div className="space-y-2">
                        <div className="h-12 flex items-center justify-center font-semibold text-sm">
                          시간대
                        </div>
                        <div className="border rounded-lg p-3 bg-white">
                          <div className="font-bold text-sm">1번특강</div>
                          <div className="text-xs text-gray-600">
                            12:00-14:00
                          </div>
                        </div>
                      </div>

                      {/* Class Slots */}
                      {[
                        { name: "접영 B", available: true, price: 70000 },
                        { name: "평영 B", available: true, price: 70000 },
                        {
                          name: "자유형 초등 A-1",
                          available: true,
                          price: 70000,
                        },
                        { name: "자유형 초등 B-1", available: false, price: 0 },
                        { name: "접영 A", available: true, price: 70000 },
                        { name: "평영 A", available: true, price: 70000 },
                      ].map((slot, index) => (
                        <div key={index} className="space-y-2">
                          <div className="h-12 flex items-center justify-center font-semibold text-sm">
                            {slot.name.split(" ")[0]}
                          </div>
                          <button
                            onClick={() => {
                              if (slot.available) {
                                setSelectedTimeSlot({
                                  name: slot.name,
                                  time: "12:00-14:00",
                                  price: slot.price,
                                  isWaitlist: false,
                                  available: slot.available,
                                });
                              } else {
                                setSelectedTimeSlot({
                                  name: slot.name,
                                  time: "12:00-14:00",
                                  price: slot.price,
                                  isWaitlist: true,
                                  available: slot.available,
                                });
                                setWaitlistClass({
                                  name: slot.name,
                                  time: "12:00-14:00",
                                  type: "평일상 / 자유형",
                                });
                                setShowWaitlistModal(true);
                              }
                            }}
                            className={`border rounded-lg p-3 bg-white w-full transition-all ${
                              selectedTimeSlot?.name === slot.name
                                ? "border-primary border-2 ring-2 ring-primary/20"
                                : "border-gray-200 hover:border-primary"
                            } ${
                              !slot.available
                                ? "cursor-pointer"
                                : "cursor-pointer"
                            }`}
                          >
                            <div className="text-sm font-medium mb-2">
                              {slot.name}
                            </div>
                            {slot.available ? (
                              <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                선결가능
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                대기신청
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

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

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">
                1. 개인정보의 수집 및 이용 목적
              </h3>
              <p className="text-gray-600 mb-2">
                회두클래스(이하 '회사')는 다음의 목적을 위하여 개인정보를
                수집하고 이용합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수강 상담 예약 및 관리</li>
                <li>수강생 본인 확인 및 연락</li>
                <li>수강 상품 안내 및 취소 안내</li>
                <li>서비스 관련 공지 및 알림 전송</li>
                <li>고객 문의 및 불만 처리</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. 수집하는 개인정보 항목</h3>
              <p className="text-gray-600 mb-2">
                회사는 예약 서비스 제공을 위해 다음과 같은 개인정보를
                수집합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  필수정보: 이름, 휴대폰 번호, 성별, 거주 지역, 수강 정보, 수강
                  목적
                </li>
                <li>선택정보: 기타정보</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                3. 개인정보의 보유 및 이용 기간
              </h3>
              <p className="text-gray-600">
                회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를
                지체 없이 파기합니다. 단, 다음의 정우에는 명시 기간 동안
                보관됩니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-2">
                <li>수강 상담 기록: 3년 (전자상거래법)</li>
                <li>
                  연금금 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)
                </li>
                <li>
                  소비자 불만 또는 분쟁처리의 공급 기록: 3년 (전자상거래법)
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. 개인정보의 제3자 제공</h3>
              <p className="text-gray-600">
                회사는 원칙적으로 고객의 개인정보를 외부에 제공하지 않습니다.
                다만, 다음의 경우는 예외로 합니 다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600 mt-2">
                <li>고객이 사전에 동의한 경우</li>
                <li>
                  법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와
                  방법에 따라 수사기관의 요 구가 있는 경우
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                5. 동의를 거부할 권리 및 불이익
              </h3>
              <p className="text-gray-600">
                고객은 개인정보 수집 및 이용에 대한 동의를 거부할 수 있습니다.
                다만, 동의 후 동의철회 대행 동의 후 서비스의 이용이 제한될 수
                있습니다.
              </p>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              본 동의는 서비스 이용 시작일로부터 종료일 또는 이용자의 서비스
              종료 요청 시까지 유효합니다.
            </p>
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

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">제1조 (목적)</h3>
              <p className="text-gray-600">
                본 약관은 회두클래스(이하 '회사')가 제공하는 수영 강의 예약
                서비스(이하 '서비스')의 이용과 관련하여 회사와 회원 간의 이용
                조건 및 관계를 규정함을 목적으로 합니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">제2조 (용어의 정의)</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  '서비스'란 회사가 제공하는 수영 강의 예약 및 관리 후 서비스를
                  말합니다.
                </li>
                <li>
                  '회원'이란 본 약관에 따라 회사가 제공하는 서비스를 이용하는
                  고객을 말합니다.
                </li>
                <li>'강의'란 회사가 제공하는 수영 교육 프로그램을 말합니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">제3조 (서비스의 제공)</h3>
              <p className="text-gray-600 mb-2">
                회사는 다음과 같은 서비스를 제공합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수영 강의 예약 및 결제 서비스</li>
                <li>강의 일정 안내 및 변경 알림</li>
                <li>수강 관련 문의 제공</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">제4조 (서비스 이용)</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  서비스 이용은 회원의 신청으로 또는 가능을 통을 지정이 완료 된
                  후부터 시작됩니다. 1회 24시간을 줍니다.
                </li>
                <li>
                  회사는 시스템 정기점검, 서버 정보 및 교육 환경의 사후 서비스를
                  중단 운영함 수 있으며, 이 경우 사전에 공지할 것 입니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">제5조 (예약 및 결제)</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  강의 예약은 담당자를 통해 진행되며, 결제 완료 시 예약이
                  확정됩니다.
                </li>
                <li>결제는 신용카드 등 회사가 정한 방법으로 진행됩니다.</li>
                <li>
                  예약 확정 후 이용자의 연락처로 예약 및 입금확인 발송됩니다.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">제6조 (이용자의 의무)</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  이용자는 타인의 정보를 도용하여 허위 정인 정보 입력 시 예약이
                  취소될 수 있습니다.
                </li>
                <li>이용자는 상담 시와 30분 전까지 도착하여 합니다.</li>
                <li>이용자는 공식적 인식 거부를 존수하여 합니다.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">제7조 (면사항 환불)</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  회사는 안정되고 및 풀은 강의를 제공하기 위해 노력합니다.
                </li>
                <li>
                  회사는 이용자의 개인정보를 보호하며, 관련 법령을 준수합니다.
                </li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
              본 약관은 2025년 1월 1일부터 시행됩니다.
            </p>
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

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. 수영 활동의 위험성 인지</h3>
              <p className="text-gray-600 mb-2">
                회사는 다음의 목적을 위해 수영 강의를 실시합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수강생의 수영 자세 교정 및 피드백 제공</li>
                <li>강의 품질 향상을 위한 분석 자료</li>
                <li>수강생 본인의 실력 향상 확인을 자료 제공</li>
                <li>교육용 모델 콘텐츠 제작 및 수영 강의 홍보 목적</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. 건강 상태 고지 의무</h3>
              <p className="text-gray-600 mb-2">
                수영장은 다음 사항에 대해 사전에 고지해야 합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>
                  심장 질환, 호흡기 질환, 고혈압 등 수영에 지장 줄 수 있는 질환
                </li>
                <li>피부 손상 시 상처 부위</li>
                <li>임신 여부</li>
                <li>평소부터 수영 특이 사항</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. 안전 수칙 준수</h3>
              <p className="text-gray-600 mb-2">
                수영장은 다음 안전 수칙을 반드시 준수하여 합니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>준비운동 및 정리운동 철저</li>
                <li>강사의 안전 지시 이행</li>
                <li>본인의 체력 및 능력 범위 내에서 활동</li>
                <li>수영 중 이상 증상 발생 시 즉시 강사에게 알림</li>
                <li>수영장 내 뛰어 달기기, 다이빙 금지 구역 준수</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. 면책 사항</h3>
              <p className="text-gray-600 mb-2">
                다음과 같은 경우는 회사는 책임을 지지 않습니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수강생의 건강 상태를 고지하지 않아 발생한 사고</li>
                <li>수강생의 안전 수칙을 위반하여 발생한 사고</li>
                <li>수강생의 스스로 또는 부주의 안전 사고</li>
                <li>천재지변 등 불가항력적 사유로 인한 사고</li>
              </ul>
            </div>

            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 text-xs ml-2">
                <h4 className="font-semibold mb-1">🚨 긴급 상황 시</h4>
                <p className="text-gray-700">
                  수영 중 아이체크, 호흡곤란, 가슴 통증 등이 발생할 경우 즉시
                  수영을 중지하고, 강사에게 알려주시기 바랍니다.
                </p>
              </AlertDescription>
            </Alert>
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

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. 환불 적용 기간</h3>
              <p className="text-gray-600">
                수업 시작 전까지 취소 시 전액 환불이 가능하며, 수업 시작 후에는
                진도율에 따라 부분 환불이 적용됩니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. 환불 금액</h3>
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-gray-700">
                  <p className="font-semibold mb-1">💯 수업 시작 전 취소</p>
                  <p className="text-xs">100% 전액 환불 가능</p>
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <h3 className="font-semibold mb-2">❌ 교재비 제외</h3>
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-gray-700">
                  <div className="border border-red-300 rounded p-3 bg-white">
                    <p className="font-semibold mb-2">교재비 차감 안내</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                      <li>수업 전</li>
                      <li>수업 중</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. 환불 방법</h3>
              <p className="text-gray-600 mb-2">
                환불은 다음 절차로 진행됩니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>환불 신청 후 3~5 영업일 내 처리</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. 환불 시점</h3>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-gray-700">
                  <p className="font-semibold mb-2">💳 환불 시점</p>
                  <p className="text-xs mb-2">
                    환불은 결제 수단에 따라 처리 시간이 달라집니다:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                    <li>
                      신용카드: 카드사 승인 취소 후 3~5 영업일 소요 (카드사마다
                      상이)
                    </li>
                    <li>실시간 계좌이체: 환불 신청 후 즉시 처리</li>
                    <li>무통장 입금: 환불 계좌 확인 후 1~3 영업일 내 입금</li>
                    <li>
                      가상계좌: 환불 신청 후 3~5 영업일 내 환불 계좌로 입금
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. 취소 방법 (고객)</h3>
              <p className="text-gray-600 mb-1">
                <span className="text-orange-600 font-medium">
                  마이페이지 &gt; 신청내역 &gt; 취소하기
                </span>
              </p>
              <p className="text-xs text-gray-500">
                또는 고객센터(1234-5678)로 연락 주시기 바랍니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">6. 환불 불가</h3>
              <p className="text-gray-600 mb-2">
                다음의 경우는 환불이불가능 등 환불 진행되지 않습니다:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>수업 진행률 50% 이상 진행된 경우</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">7. 환불 기한</h3>
              <p className="text-gray-600">
                환불은 신청일로부터 영업일 기준 7일 이내 처리되며, 카드사 및
                은행 사정에 따라 지연될 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">8. 취소 재등록 (신청)</h3>
              <p className="text-gray-600">
                수업을 취소한 후 재등록을 원하실 경우, 신청 가능한 수업이 있을
                시 다시 신청하실 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">9. 해지 및 환불 금지기</h3>
              <p className="text-gray-600">
                환불 신청 후 처리 중일 때는 중복 신청이 불가능합니다.
              </p>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-gray-700">
                <p className="font-semibold mb-2">⚠️ 특별 안내</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
                  <li>
                    천재지변, 감염병 등으로 수업이 불가능할 경우 전액
                    환불됩니다.
                  </li>
                  <li>
                    강사 사정으로 수업이 취소될 경우 전액 환불 또는 일정 변경이
                    가능합니다.
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
              환불 문의는 고객센터(1234-5678) 또는 이메일(support@example.com)로
              연락 주시기 바랍니다. 평일 오전 9시~오후 6시까지 운영됩니다.
            </p>
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
    </div>
  );
}
