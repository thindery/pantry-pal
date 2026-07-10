import { SignUp } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

export function generateStaticParams() {
  return [{ "sign-up": [] }];
}

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-emerald-600 font-serif-heading">
          PantryPal
        </h1>
        <p className="text-slate-600">Create your account to get started</p>
      </div>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full flex justify-center">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in/"
          appearance={clerkAuthAppearance}
        />
      </div>
    </div>
  );
}