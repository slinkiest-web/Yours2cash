import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "../ui/Button"
import { Modal } from "../ui/Modal"
import { Textarea } from "../ui/Textarea"
import { useToast } from "../ui/Toast"
import { createReview, updateReview } from "../../lib/queries/reviews"
import { reviewSchema, type ReviewFormValues } from "../../lib/validation/review"
import { StarRatingInput } from "./StarRatingInput"
import type { Review } from "../../types/database"

export interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  orderId: string
  sellerId: string
  buyerId: string
  /** When provided, the modal edits this review instead of creating a new one. */
  existingReview?: Pick<Review, "id" | "rating" | "comment"> | null
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  orderId,
  sellerId,
  buyerId,
  existingReview,
}) => {
  const { showToast } = useToast()
  const isEdit = !!existingReview

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: existingReview?.rating ?? 0, comment: existingReview?.comment ?? "" },
  })
  const rating = watch("rating")

  // Re-sync whenever we switch between create and edit (or open for a
  // different review) rather than only on first mount.
  useEffect(() => {
    reset({ rating: existingReview?.rating ?? 0, comment: existingReview?.comment ?? "" })
  }, [existingReview, reset])

  const onSubmit = async (values: ReviewFormValues) => {
    const { error } = isEdit
      ? await updateReview(existingReview.id, values.rating, values.comment || undefined)
      : await createReview(orderId, buyerId, sellerId, values.rating, values.comment || undefined)

    if (error) {
      showToast(error, "error")
      return
    }
    showToast(isEdit ? "Review updated." : "Review submitted. Thank you!", "success")
    onSaved()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Your Review" : "Rate the Seller"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <StarRatingInput
          value={rating}
          onChange={(value) => setValue("rating", value, { shouldValidate: true })}
          error={errors.rating?.message}
        />

        <Textarea
          label="Comment (optional)"
          placeholder="Share details about your experience with this seller"
          rows={3}
          error={errors.comment?.message}
          {...register("comment")}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEdit ? "Save Changes" : "Submit Review"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
