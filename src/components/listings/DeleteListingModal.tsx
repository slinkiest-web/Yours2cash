import React, { useState } from "react"
import { Button } from "../ui/Button"
import { Modal } from "../ui/Modal"
import { useToast } from "../ui/Toast"
import { deleteListing } from "../../lib/queries/listings"

export interface DeleteListingModalProps {
  isOpen: boolean
  onClose: () => void
  listingId: string
  listingTitle: string
  onDeleted: () => void
}

export const DeleteListingModal: React.FC<DeleteListingModalProps> = ({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  onDeleted,
}) => {
  const { showToast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const { error } = await deleteListing(listingId)
    setIsDeleting(false)
    if (error) {
      showToast(error, "error")
      return
    }
    showToast("Listing removed.", "success")
    onClose()
    onDeleted()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete this listing?">
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          This removes "{listingTitle}" from Yours2Cash. Buyers will no longer be able to find or
          message you about it. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" isLoading={isDeleting} onClick={handleDelete}>
            Delete Listing
          </Button>
        </div>
      </div>
    </Modal>
  )
}
