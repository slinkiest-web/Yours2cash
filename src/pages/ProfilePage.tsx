import React, { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera } from "lucide-react"
import { Card } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { Select } from "../components/ui/Select"
import { Textarea } from "../components/ui/Textarea"
import { Button } from "../components/ui/Button"
import { Avatar } from "../components/ui/Avatar"
import { Spinner } from "../components/ui/Spinner"
import { useToast } from "../components/ui/Toast"
import { useAuth } from "../context/AuthContext"
import { getAvatarPublicUrl, updateProfile, uploadAvatar } from "../lib/queries/profiles"
import { profileSchema, type ProfileFormValues } from "../lib/validation/auth"
import { NIGERIAN_STATES } from "../utils/nigeria"
import { PurchaseHistorySection } from "./profile/PurchaseHistorySection"
import { SalesHistorySection } from "./profile/SalesHistorySection"
import { ReviewsReceivedSection } from "./profile/ReviewsReceivedSection"

const STATE_OPTIONS = NIGERIAN_STATES.map((state) => ({ value: state, label: state }))

export const ProfilePage: React.FC = () => {
  const { user, profile, profileComplete, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const isSetupFlow = !profileComplete
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: "", state: "", city: "", bio: "" },
  })

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name ?? "",
        state: profile.state ?? "",
        city: profile.city ?? "",
        bio: profile.bio ?? "",
      })
    }
  }, [profile, reset])

  if (!profile || !user) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const onSubmit = async (values: ProfileFormValues) => {
    const { error } = await updateProfile(user.id, {
      display_name: values.display_name,
      state: values.state,
      city: values.city || null,
      bio: values.bio || null,
    })
    if (error) {
      showToast(error, "error")
      return
    }
    await refreshProfile()
    showToast(isSetupFlow ? "Profile complete. Welcome to Yours2Cash!" : "Profile updated.", "success")
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setUploadingAvatar(true)
    const { error } = await uploadAvatar(user.id, file)
    setUploadingAvatar(false)

    if (error) {
      showToast(error, "error")
      return
    }
    await refreshProfile()
    showToast("Avatar updated.", "success")
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <Card className="p-6 md:p-8 space-y-6 max-w-xl mx-auto">
        <div className="border-b border-border pb-4 flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-serif text-text">
              {isSetupFlow ? "Complete Your Profile" : "Profile Settings"}
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {isSetupFlow
                ? "Tell us a bit about yourself before you start buying and selling."
                : "Configure avatar, name, and Nigerian region details."}
            </p>
          </div>
          <div className="relative shrink-0">
            <Avatar name={profile.display_name} src={getAvatarPublicUrl(profile.avatar_url)} size="lg" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full border-2 border-surface-raised hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
              aria-label="Upload avatar image"
            />
          </div>
        </div>

        {isSetupFlow && (
          <div className="text-sm bg-primary/10 text-primary border border-primary/20 rounded-lg px-4 py-3">
            Add your display name and state to unlock selling, chat, and orders.
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input label="Display Name" error={errors.display_name?.message} {...register("display_name")} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="State"
              placeholder="Select a state"
              options={STATE_OPTIONS}
              error={errors.state?.message}
              {...register("state")}
            />
            <Input
              label="City"
              placeholder="e.g. Ikeja"
              error={errors.city?.message}
              {...register("city")}
            />
          </div>

          <Textarea
            label="Bio"
            placeholder="Tell buyers and sellers a little about yourself"
            rows={3}
            error={errors.bio?.message}
            {...register("bio")}
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            {isSetupFlow ? "Complete Profile" : "Save Changes"}
          </Button>
        </form>
      </Card>

      {!isSetupFlow && (
        <>
          <PurchaseHistorySection userId={user.id} />
          <SalesHistorySection userId={user.id} />
          <ReviewsReceivedSection userId={user.id} />
        </>
      )}
    </div>
  )
}
