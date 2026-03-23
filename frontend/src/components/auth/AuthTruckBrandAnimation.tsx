import { Truck } from "lucide-react";

/**
 * Logo-like sequence: truck 1 enters, truck 2 follows behind, then DE first, then staircase MA.
 */
export function AuthTruckBrandAnimation({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-full flex-nowrap items-center justify-center gap-1 sm:justify-start sm:gap-2 lg:justify-end lg:gap-2 ${className}`}
      aria-hidden
    >
      <div className="relative w-[220px] shrink-0 sm:w-[236px]">
        <div className="pointer-events-none absolute -inset-7 rounded-3xl bg-gradient-to-r from-blue-500/20 via-violet-500/12 to-transparent opacity-0 blur-2xl auth-truck-glow-fade" />

        <div className="relative z-10 h-[150px] sm:h-[164px]">
          {/* Horizontal lane like your logo trucks */}
          <div className="absolute bottom-2 left-[92px] h-[56px] w-[118px] rounded-[16px] border border-slate-500/35 bg-gradient-to-b from-slate-600 via-slate-800 to-slate-950 shadow-[inset_0_3px_12px_rgb(0_0_0_/_0.52),0_8px_22px_-10px_rgb(0_0_0_/_0.55)] sm:left-[100px] sm:w-[126px]">
            <div
              className="auth-road-dashes pointer-events-none absolute inset-x-3 top-1/2 h-[3px] -translate-y-1/2"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgb(250 204 21 / 0.95) 0px, rgb(250 204 21 / 0.95) 14px, transparent 14px, transparent 28px)",
                backgroundSize: "28px 100%",
              }}
            />
          </div>

          {/* Trucks: 1st enters, 2nd follows slightly behind */}
          <Truck
            className="auth-truck-enter-1 absolute bottom-[38px] left-[92px] h-[5.6rem] w-[5.6rem] text-sky-300 drop-shadow-[0_6px_15px_rgb(0_0_0_/_0.5)] sm:left-[100px] sm:h-[6rem] sm:w-[6rem]"
            strokeWidth={1}
          />
          <Truck
            className="auth-truck-enter-2 absolute bottom-[34px] left-[130px] h-[4.95rem] w-[4.95rem] text-violet-300 drop-shadow-[0_6px_13px_rgb(0_0_0_/_0.45)] sm:left-[142px] sm:h-[5.35rem] sm:w-[5.35rem]"
            strokeWidth={1}
          />

        </div>
      </div>

      {/* DE first, then staircase MA (as your sign style) */}
      <div className="auth-logo-board relative z-[1] inline-flex h-[150px] shrink-0 translate-x-[-4px] translate-y-[4px] flex-col items-start justify-center sm:h-[164px] sm:translate-x-[-6px] sm:translate-y-[6px]">
        <div className="flex items-end gap-0 text-[1.95rem] font-black leading-none tracking-[-0.01em] sm:text-[2.25rem]">
          <span className="auth-de-letter auth-de-d text-white">D</span>
          <span className="auth-de-letter auth-de-e text-white">E</span>
        </div>
        <div className="ml-[0.92rem] -mt-[0.22rem] flex items-end gap-0 text-[1.95rem] font-black leading-none tracking-[-0.01em] sm:ml-[1.08rem] sm:text-[2.25rem]">
          <span className="auth-stair-letter auth-stair-m text-red-500">M</span>
          <span className="auth-stair-letter auth-stair-a text-red-500">A</span>
        </div>
      </div>
    </div>
  );
}
