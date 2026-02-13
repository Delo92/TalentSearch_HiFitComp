import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import SiteNavbar from "@/components/site-navbar";
import SiteFooter from "@/components/site-footer";
import { useLivery } from "@/hooks/use-livery";
import { CheckCircle, Send, CreditCard } from "lucide-react";

interface JoinSettings {
  mode: "request" | "purchase";
  price: number;
  pageTitle: string;
  pageDescription: string;
  requiredFields: string[];
  isActive: boolean;
}

interface PaymentConfig {
  apiLoginId: string;
  clientKey: string;
  environment: string;
}

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        secureData: any,
        callback: (response: any) => void,
      ) => void;
    };
  }
}

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full Name",
  email: "Email",
  phone: "Phone Number",
  address: "Street Address",
  city: "City",
  state: "State",
  zip: "ZIP Code",
  bio: "Bio / About You",
  category: "Talent Category",
  socialLinks: "Social Media Links",
};

export default function JoinPage() {
  const { toast } = useToast();
  const { getImage } = useLivery();

  const [form, setForm] = useState<Record<string, string>>({});
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptLoaded, setAcceptLoaded] = useState(false);

  const { data: settings, isLoading } = useQuery<JoinSettings>({
    queryKey: ["/api/join/settings"],
  });

  const { data: paymentConfig } = useQuery<PaymentConfig>({
    queryKey: ["/api/payment-config"],
  });

  useEffect(() => {
    if (paymentConfig && settings?.mode === "purchase" && !acceptLoaded) {
      const scriptUrl = paymentConfig.environment === "production"
        ? "https://js.authorize.net/v1/Accept.js"
        : "https://jstest.authorize.net/v1/Accept.js";
      const existing = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existing) { setAcceptLoaded(true); return; }
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => setAcceptLoaded(true);
      document.head.appendChild(script);
    }
  }, [paymentConfig, settings, acceptLoaded]);

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isRequired = (field: string) => settings?.requiredFields?.includes(field) ?? false;

  const handleSubmit = useCallback(async () => {
    if (!settings) return;

    for (const field of settings.requiredFields) {
      if (!form[field]?.trim()) {
        toast({ title: `${FIELD_LABELS[field] || field} is required`, variant: "destructive" });
        return;
      }
    }

    setProcessing(true);

    const submitData = async (dataDescriptor?: string, dataValue?: string) => {
      try {
        await apiRequest("POST", "/api/join/submit", {
          ...form,
          mediaUrls: [],
          dataDescriptor,
          dataValue,
        });
        setSuccess(true);
        toast({ title: "Application submitted!", description: "We'll review your submission and get back to you." });
      } catch (error: any) {
        toast({ title: "Submission Failed", description: error.message?.replace(/^\d+:\s*/, "") || "Something went wrong", variant: "destructive" });
      } finally {
        setProcessing(false);
      }
    };

    if (settings.mode === "purchase" && settings.price > 0) {
      if (!cardNumber || !expMonth || !expYear || !cvv) {
        toast({ title: "Please enter your card details", variant: "destructive" });
        setProcessing(false);
        return;
      }
      if (!paymentConfig || !window.Accept) {
        toast({ title: "Payment system not ready", variant: "destructive" });
        setProcessing(false);
        return;
      }
      window.Accept.dispatchData({
        authData: { clientKey: paymentConfig.clientKey, apiLoginID: paymentConfig.apiLoginId },
        cardData: {
          cardNumber: cardNumber.replace(/\s/g, ""),
          month: expMonth.padStart(2, "0"),
          year: expYear.length === 2 ? `20${expYear}` : expYear,
          cardCode: cvv,
        },
      }, async (tokenResponse: any) => {
        if (tokenResponse.messages?.resultCode === "Error") {
          setProcessing(false);
          toast({ title: "Payment Error", description: tokenResponse.messages.message[0]?.text, variant: "destructive" });
          return;
        }
        if (!tokenResponse.opaqueData) {
          setProcessing(false);
          toast({ title: "Payment Error", description: "Failed to tokenize card", variant: "destructive" });
          return;
        }
        await submitData(tokenResponse.opaqueData.dataDescriptor, tokenResponse.opaqueData.dataValue);
      });
    } else {
      await submitData();
    }
  }, [settings, form, cardNumber, expMonth, expYear, cvv, paymentConfig, toast]);

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SiteNavbar />
        <div className="max-w-lg mx-auto px-4 py-32 text-center">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />
          <h2 className="text-2xl uppercase font-normal mb-4" style={{ letterSpacing: "10px" }} data-testid="text-success">
            APPLICATION SUBMITTED
          </h2>
          <p className="text-white/60 mb-8">
            Thank you for your interest! Our team will review your application and contact you at {form.email}.
          </p>
          <a href="/competitions">
            <span className="inline-block bg-[#FF5A09] text-white font-bold text-sm uppercase px-8 leading-[47px] border border-[#FF5A09] transition-all duration-500 hover:bg-transparent hover:text-[#FF5A09] cursor-pointer" data-testid="button-browse">
              Browse Competitions
            </span>
          </a>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-black">
        <SiteNavbar />
        <div className="max-w-2xl mx-auto px-4 py-32">
          <div className="h-8 w-1/2 bg-white/10 animate-pulse mb-6" />
          <div className="h-48 bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!settings.isActive) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SiteNavbar />
        <div className="max-w-lg mx-auto px-4 py-32 text-center">
          <h2 className="text-2xl uppercase font-normal mb-4" style={{ letterSpacing: "10px" }}>
            CURRENTLY CLOSED
          </h2>
          <p className="text-white/40">Join applications are not being accepted at this time. Check back later.</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const allFields = ["fullName", "email", "phone", "address", "city", "state", "zip", "bio", "category", "socialLinks"];

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNavbar />

      <section
        className="relative h-[270px] md:h-[300px] bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url('${getImage("breadcrumb_bg", "/images/template/breadcumb.jpg")}')` }}
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white text-center pt-8 pb-5 px-8 z-10 w-[calc(100%-60px)] max-w-[552px]">
          <p className="text-[#5f5f5f] text-base leading-relaxed mb-1">Get Started</p>
          <h2
            className="text-[24px] md:text-[30px] uppercase text-black font-normal leading-none"
            style={{ letterSpacing: "10px" }}
            data-testid="text-page-title"
          >
            {settings.pageTitle}
          </h2>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-white/40 text-sm mb-10 max-w-xl" data-testid="text-page-description">
          {settings.pageDescription}
        </p>

        {settings.mode === "purchase" && settings.price > 0 && (
          <div className="border border-[#FF5A09]/30 bg-[#FF5A09]/5 p-4 mb-8">
            <p className="text-[#FF5A09] font-bold uppercase text-sm" style={{ letterSpacing: "2px" }}>
              Entry Fee: ${(settings.price / 100).toFixed(2)}
            </p>
            <p className="text-white/40 text-xs mt-1">Payment is required to submit your application.</p>
          </div>
        )}

        <div className="space-y-5 mb-10">
          <p className="text-[#5f5f5f] text-sm mb-1">Your Information</p>
          <h3 className="text-lg uppercase text-white font-normal mb-6" style={{ letterSpacing: "6px" }}>
            APPLICATION FORM
          </h3>

          {allFields.map((field) => {
            const required = isRequired(field);
            const label = FIELD_LABELS[field] || field;

            if (field === "bio") {
              return (
                <div key={field}>
                  <Label htmlFor={field} className="text-white/60 uppercase text-xs tracking-wider">
                    {label} {required && <span className="text-[#FF5A09]">*</span>}
                  </Label>
                  <Textarea
                    id={field}
                    value={form[field] || ""}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-2 resize-none min-h-[100px]"
                    placeholder={`Enter your ${label.toLowerCase()}`}
                    required={required}
                    data-testid={`input-${field}`}
                  />
                </div>
              );
            }

            if (["address", "city", "state", "zip"].includes(field)) {
              if (field === "address") {
                return (
                  <div key="address-group">
                    <Label className="text-white/60 uppercase text-xs tracking-wider">
                      Address {(isRequired("address") || isRequired("city") || isRequired("state") || isRequired("zip")) && <span className="text-[#FF5A09]">*</span>}
                    </Label>
                    <Input
                      id="address"
                      value={form.address || ""}
                      onChange={(e) => updateField("address", e.target.value)}
                      className="bg-white/5 border-white/10 text-white mt-2"
                      placeholder="Street address"
                      required={isRequired("address")}
                      data-testid="input-address"
                    />
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <Input
                        value={form.city || ""}
                        onChange={(e) => updateField("city", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="City"
                        required={isRequired("city")}
                        data-testid="input-city"
                      />
                      <Input
                        value={form.state || ""}
                        onChange={(e) => updateField("state", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="State"
                        required={isRequired("state")}
                        data-testid="input-state"
                      />
                      <Input
                        value={form.zip || ""}
                        onChange={(e) => updateField("zip", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="ZIP"
                        required={isRequired("zip")}
                        data-testid="input-zip"
                      />
                    </div>
                  </div>
                );
              }
              return null;
            }

            return (
              <div key={field}>
                <Label htmlFor={field} className="text-white/60 uppercase text-xs tracking-wider">
                  {label} {required && <span className="text-[#FF5A09]">*</span>}
                </Label>
                <Input
                  id={field}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  value={form[field] || ""}
                  onChange={(e) => updateField(field, e.target.value)}
                  className="bg-white/5 border-white/10 text-white mt-2"
                  placeholder={`Enter your ${label.toLowerCase()}`}
                  required={required}
                  data-testid={`input-${field}`}
                />
              </div>
            );
          })}
        </div>

        {settings.mode === "purchase" && settings.price > 0 && (
          <div className="mb-10">
            <p className="text-[#5f5f5f] text-sm mb-1">Payment</p>
            <h3 className="text-lg uppercase text-white font-normal mb-6" style={{ letterSpacing: "6px" }}>
              CARD DETAILS
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="join-card" className="text-white/60 uppercase text-xs tracking-wider">Card Number</Label>
                <Input id="join-card" type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, ""))}
                  className="bg-white/5 border-white/10 text-white mt-2" placeholder="4111 1111 1111 1111" maxLength={19} data-testid="input-card-number" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white/60 uppercase text-xs tracking-wider">Month</Label>
                  <Input type="text" value={expMonth} onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="bg-white/5 border-white/10 text-white mt-2" placeholder="MM" maxLength={2} data-testid="input-exp-month" />
                </div>
                <div>
                  <Label className="text-white/60 uppercase text-xs tracking-wider">Year</Label>
                  <Input type="text" value={expYear} onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="bg-white/5 border-white/10 text-white mt-2" placeholder="YYYY" maxLength={4} data-testid="input-exp-year" />
                </div>
                <div>
                  <Label className="text-white/60 uppercase text-xs tracking-wider">CVV</Label>
                  <Input type="text" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="bg-white/5 border-white/10 text-white mt-2" placeholder="123" maxLength={4} data-testid="input-cvv" />
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={processing}
          className="w-full bg-[#FF5A09] text-white font-bold text-base uppercase px-8 leading-[52px] border border-[#FF5A09] transition-all duration-500 hover:bg-transparent hover:text-[#FF5A09] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          data-testid="button-submit"
        >
          {settings.mode === "purchase" && settings.price > 0 ? (
            <>
              <CreditCard className="h-5 w-5" />
              {processing ? "PROCESSING..." : `PAY $${(settings.price / 100).toFixed(2)} & APPLY`}
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              {processing ? "SUBMITTING..." : "SUBMIT APPLICATION"}
            </>
          )}
        </button>

        {settings.mode === "purchase" && (
          <p className="text-white/30 text-xs text-center mt-4">
            Payments processed securely via Authorize.Net.
          </p>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
