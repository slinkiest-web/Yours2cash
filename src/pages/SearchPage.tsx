import React from "react"
import { ListingBrowser } from "../components/listings/ListingBrowser"

export const SearchPage: React.FC = () => (
  <>
    <h1 className="sr-only">Search Listings</h1>
    <ListingBrowser />
  </>
)
