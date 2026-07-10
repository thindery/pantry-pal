import { SignIn } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export function generateStaticParams() {
  return [{ "sign-in": [] }];
}

export default function SignInPage() {
  return (
    <div className="w-full max-w-md flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-emerald-600 font-serif-heading">
          PantryPal
        </h1>
        <p className="text-slate-600">Smart inventory & ledger for your home</p>
      </div>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full flex justify-center">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up/"
          appearance={clerkAuthAppearance}
        />
      </div>
    </div>
  );
}