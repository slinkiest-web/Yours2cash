import React, { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { PlusCircle, ShoppingBag, X } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Select } from "../../components/ui/Select"
import { Textarea } from "../../components/ui/Textarea"
import { Button } from "../../components/ui/Button"
import { Spinner } from "../../components/ui/Spinner"
import { EmptyState } from "../../components/ui/EmptyState"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import {
  createListing,
  deleteListingImage,
  fetchCategories,
  fetchListingById,
  getListingImagePublicUrl,
  updateListing,
  uploadListingPhoto,
} from "../../lib/queries"
import { listingSchema, type ListingFormValues } from "../../lib/validation/listing"
import { CONDITION_OPTIONS, MAX_LISTING_PHOTOS } from "../../utils/listingOptions"
import { NIGERIAN_STATES } from "../../utils/nigeria"
import type { ListingImage } from "../../types/database"

interface PendingPhoto {
  file: File
  previewUrl: string
}

export const ListingFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const categories = categoriesQuery.data?.data ?? []

  const listingQuery = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id!),
    enabled: isEdit,
  })
  const listing = listingQuery.data?.data

  const [existingImages, setExistingImages] = useState<ListingImage[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [removingImageId, setRemovingImageId] = useState<string | null>(null)
  const pendingPhotosRef = useRef<PendingPhoto[]>([])
  pendingPhotosRef.current = pendingPhotos

  useEffect(() => {
    return () => {
      pendingPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
    }
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      category_id: "",
      condition: "good",
      state: "",
      city: "",
    },
  })

  useEffect(() => {
    if (listing) {
      reset({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category_id: listing.category_id,
        condition: listing.condition,
        state: listing.state,
        city: listing.city ?? "",
      })
      setExistingImages([...listing.listing_images].sort((a, b) => a.position - b.position))
    }
  }, [listing, reset])

  useEffect(() => {
    if (isEdit && listing && user && listing.seller_id !== user.id) {
      showToast("You can only edit your own listings.", "error")
      navigate("/dashboard", { replace: true })
    }
  }, [isEdit, listing, user, navigate, showToast])

  const totalPhotoCount = existingImages.length + pendingPhotos.length

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return

    const room = MAX_LISTING_PHOTOS - totalPhotoCount
    if (room <= 0) {
      showToast(`You can upload up to ${MAX_LISTING_PHOTOS} photos.`, "error")
      return
    }

    const accepted = files.slice(0, room)
    if (files.length > accepted.length) {
      showToast(`Only ${room} more photo(s) can be added (max ${MAX_LISTING_PHOTOS}).`, "error")
    }
    setPendingPhotos((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ])
  }

  const handleRemovePendingPhoto = (index: number) => {
    setPendingPhotos((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleRemoveExistingImage = async (image: ListingImage) => {
    setRemovingImageId(image.id)
    const { error } = await deleteListingImage(image.id, image.storage_path)
    setRemovingImageId(null)
    if (error) {
      showToast(error, "error")
      return
    }
    setExistingImages((prev) => prev.filter((img) => img.id !== image.id))
  }

  const onSubmit = async (values: ListingFormValues) => {
    if (!user) return

    if (!isEdit && totalPhotoCount === 0) {
      showToast("Add at least one photo before publishing.", "error")
      return
    }

    const payload = {
      title: values.title,
      description: values.description,
      price: values.price,
      category_id: values.category_id,
      condition: values.condition,
      state: values.state,
      city: values.city || null,
    }

    if (isEdit) {
      const { error } = await updateListing(id!, payload)
      if (error) {
        showToast(error, "error")
        return
      }

      let uploadFailed = false
      for (let i = 0; i < pendingPhotos.length; i++) {
        const { error: uploadError } = await uploadListingPhoto(
          id!,
          pendingPhotos[i].file,
          existingImages.length + i
        )
        if (uploadError) uploadFailed = true
      }

      queryClient.invalidateQueries({ queryKey: ["listing", id] })
      queryClient.invalidateQueries({ queryKey: ["listings"] })
      showToast(
        uploadFailed ? "Listing updated, but some photos failed to upload." : "Listing updated.",
        uploadFailed ? "error" : "success"
      )
      navigate(`/product/${id}`)
      return
    }

    const { data: newListing, error } = await createListing({ ...payload, seller_id: user.id })
    if (error || !newListing) {
      showToast(error ?? "Could not create listing.", "error")
      return
    }

    let uploadFailed = false
    for (let i = 0; i < pendingPhotos.length; i++) {
      const { error: uploadError } = await uploadListingPhoto(newListing.id, pendingPhotos[i].file, i)
      if (uploadError) uploadFailed = true
    }

    queryClient.invalidateQueries({ queryKey: ["listings"] })
    showToast(
      uploadFailed ? "Listing published, but some photos failed to upload." : "Listing published.",
      uploadFailed ? "error" : "success"
    )
    navigate(`/product/${newListing.id}`)
  }

  if (isEdit && listingQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isEdit && !listingQuery.isLoading && !listing) {
    return (
      <div className="py-12">
        <EmptyState
          icon={ShoppingBag}
          title="Listing not found"
          description="This listing does not exist, or you do not have access to edit it."
          actionLabel="Go to Dashboard"
          onAction={() => navigate("/dashboard")}
        />
      </div>
    )
  }

  if (isEdit && listing && user && listing.seller_id !== user.id) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-6 md:p-8 space-y-6">
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-serif text-text">
            {isEdit ? "Edit Listing" : "Create a Listing"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Upload images and describe your listing to find buyers.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <span className="text-sm font-semibold text-text">
              Photos ({totalPhotoCount}/{MAX_LISTING_PHOTOS})
            </span>
            <div className="grid grid-cols-3 gap-3">
              {existingImages.map((image) => (
                <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <img
                    src={getListingImagePublicUrl(image.storage_path)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(image)}
                    disabled={removingImageId === image.id}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {pendingPhotos.map((photo, index) => (
                <div key={photo.previewUrl} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePendingPhoto(index)}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {totalPhotoCount < MAX_LISTING_PHOTOS && (
                <label className="aspect-square border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 bg-surface-raised cursor-pointer hover:border-primary transition-colors">
                  <PlusCircle className="w-6 h-6 text-text-muted" />
                  <span className="text-xs font-semibold text-text">Add Photo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="sr-only"
                    onChange={handleFilesSelected}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-text-muted">PNG, JPG, or WebP, up to {MAX_LISTING_PHOTOS} images.</p>
          </div>

          <Input label="Title" placeholder="e.g. Smart Watch Series 8" error={errors.title?.message} {...register("title")} />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (NGN)"
              type="number"
              min={0}
              step="1"
              placeholder="₦"
              error={errors.price?.message}
              {...register("price", { valueAsNumber: true })}
            />
            <Select
              label="Category"
              placeholder="Select a category"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.category_id?.message}
              {...register("category_id")}
            />
          </div>

          <Select
            label="Condition"
            placeholder="Select condition"
            options={CONDITION_OPTIONS}
            error={errors.condition?.message}
            {...register("condition")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="State"
              placeholder="Select a state"
              options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))}
              error={errors.state?.message}
              {...register("state")}
            />
            <Input label="City" placeholder="e.g. Ikeja" error={errors.city?.message} {...register("city")} />
          </div>

          <Textarea
            label="Description"
            placeholder="Describe the condition, features, and other details"
            rows={4}
            error={errors.description?.message}
            {...register("description")}
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            {isEdit ? "Save Changes" : "Publish Listing"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
