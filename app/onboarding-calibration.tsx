"use client";
/* eslint-disable react-hooks/set-state-in-effect -- browser completion state is hydrated after SSR to avoid a mismatched dialog tree. */
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gift,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useExperience, type InterfaceMode } from "./experience";
import "./onboarding-calibration.css";

const storageKey = "lifequest.onboarding.calibration.v1";
export function OnboardingCalibration() {
  const { update } = useExperience();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(localStorage.getItem(storageKey) !== "complete");
  }, []);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [capacity, setCapacity] = useState(5);
  const [reward, setReward] = useState("Quiet acknowledgement");
  const [notifications, setNotifications] = useState("Essential only");
  const [mode, setMode] = useState<InterfaceMode>("standard");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  if (!open) return null;
  const finish = () => {
    localStorage.setItem(storageKey, "complete");
    localStorage.setItem("lifequest.onboarding.goal", goal.trim());
    localStorage.setItem("lifequest.onboarding.capacity", String(capacity));
    update({ mode });
    setOpen(false);
  };
  const skip = () => {
    localStorage.setItem(storageKey, "complete");
    setOpen(false);
  };
  return (
    <div className="calibration-backdrop">
      <section
        className="calibration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calibration-title"
      >
        <header>
          <div>
            <Sparkles size={17} />
            <span>OPTIONAL CALIBRATION · {step + 1}/5</span>
          </div>
          <button ref={closeRef} onClick={skip} aria-label="Skip calibration">
            <X size={18} />
          </button>
        </header>
        <div className="calibration-progress">
          <i style={{ width: `${(step + 1) * 20}%` }} />
        </div>
        {step === 0 && (
          <div className="calibration-step">
            <Target size={24} />
            <p>START SMALL</p>
            <h2 id="calibration-title">What meaningful outcome matters now?</h2>
            <span>
              Choose one direction. You can edit it later and unlock advanced
              systems gradually.
            </span>
            <label>
              Starting goal
              <input
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Example: publish one honest portfolio case study"
                maxLength={180}
              />
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="calibration-step">
            <Clock3 size={24} />
            <p>REALISTIC CAPACITY</p>
            <h2 id="calibration-title">
              How many focused hours fit your week?
            </h2>
            <span>
              This shapes planning suggestions only. It never limits what you
              may accomplish.
            </span>
            <label>
              Weekly focused capacity
              <input
                type="range"
                min="1"
                max="20"
                value={capacity}
                onChange={(event) => setCapacity(Number(event.target.value))}
              />
              <b>{capacity} hours / week</b>
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="calibration-step">
            <Gift size={24} />
            <p>REWARD COMFORT</p>
            <h2 id="calibration-title">How should progress feel?</h2>
            <span>
              Rewards acknowledge real-world completion. App visits, clicks, and
              attention never create XP.
            </span>
            <div className="calibration-options">
              {[
                "Quiet acknowledgement",
                "Balanced celebration",
                "Full visual celebration",
              ].map((item) => (
                <button
                  key={item}
                  className={reward === item ? "active" : ""}
                  onClick={() => setReward(item)}
                >
                  {reward === item ? <Check size={14} /> : null}
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="calibration-step">
            <Bell size={24} />
            <p>NOTIFICATION COMFORT</p>
            <h2 id="calibration-title">Choose a calm starting budget</h2>
            <span>
              No guilt, fake urgency, or repeated nagging. Security messages
              remain distinct.
            </span>
            <div className="calibration-options">
              {[
                "Essential only",
                "One daily summary",
                "Planning and reminders",
              ].map((item) => (
                <button
                  key={item}
                  className={notifications === item ? "active" : ""}
                  onClick={() => setNotifications(item)}
                >
                  {notifications === item ? <Check size={14} /> : null}
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="calibration-step">
            <ShieldCheck size={24} />
            <p>INTERFACE MODE</p>
            <h2 id="calibration-title">Choose how much SYSTEM reveals</h2>
            <span>
              Next, you can choose starting attributes and skills. They are a
              self-assessment—not a permanent identity.
            </span>
            <div className="calibration-options modes">
              {(["minimal", "standard", "immersive"] as InterfaceMode[]).map(
                (item) => (
                  <button
                    key={item}
                    className={mode === item ? "active" : ""}
                    onClick={() => setMode(item)}
                  >
                    {mode === item ? <Check size={14} /> : null}
                    <b>{item}</b>
                  </button>
                ),
              )}
            </div>
            <aside>
              <ShieldCheck size={15} />
              Real-world completion—not app usage—creates progress.
            </aside>
          </div>
        )}
        <footer>
          <button onClick={skip}>Skip for now</button>
          <div>
            {step > 0 && (
              <button onClick={() => setStep((value) => value - 1)}>
                <ChevronLeft size={15} />
                Back
              </button>
            )}
            <button
              className="calibration-next"
              disabled={step === 0 && !goal.trim()}
              onClick={() =>
                step < 4 ? setStep((value) => value + 1) : finish()
              }
            >
              {step === 4 ? "Continue to attributes" : "Continue"}
              <ChevronRight size={15} />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
