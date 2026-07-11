import { describe, it, expect } from "vitest"
import {
  DEFAULT_LISTING_FILTERS,
  listingFilterStateToQuery,
  listingFiltersToParams,
  parseListingFilters,
  type ListingFilterState,
} from "../listingFilters"

describe("parseListingFilters", () => {
  it("returns all defaults for an empty query string", () => {
    expect(parseListingFilters(new URLSearchParams())).toEqual(DEFAULT_LISTING_FILTERS)
  })

  it("reads every supported field from the query string", () => {
    const params = new URLSearchParams({
      q: "soundbar",
      category: "electronics",
      state: "Lagos",
      city: "Ikeja",
      condition: "like_new",
      minPrice: "10000",
      maxPrice: "50000",
      sort: "price_asc",
    })

    expect(parseListingFilters(params)).toEqual({
      q: "soundbar",
      category: "electronics",
      state: "Lagos",
      city: "Ikeja",
      condition: "like_new",
      minPrice: "10000",
      maxPrice: "50000",
      sort: "price_asc",
    })
  })

  it("falls back to newest for a missing or invalid sort value", () => {
    expect(parseListingFilters(new URLSearchParams()).sort).toBe("newest")
    expect(parseListingFilters(new URLSearchParams({ sort: "not-a-real-sort" })).sort).toBe("newest")
  })

  it("treats an explicit empty param the same as a missing one", () => {
    const params = new URLSearchParams({ q: "", state: "" })
    expect(parseListingFilters(params).q).toBe("")
    expect(parseListingFilters(params).state).toBe("")
  })
})

describe("listingFiltersToParams", () => {
  it("produces an empty query string for default filter state", () => {
    expect(listingFiltersToParams(DEFAULT_LISTING_FILTERS).toString()).toBe("")
  })

  it("omits sort from the URL when it is the default (newest)", () => {
    const params = listingFiltersToParams({ ...DEFAULT_LISTING_FILTERS, q: "watch" })
    expect(params.has("sort")).toBe(false)
    expect(params.get("q")).toBe("watch")
  })

  it("includes a non-default sort", () => {
    const params = listingFiltersToParams({ ...DEFAULT_LISTING_FILTERS, sort: "price_desc" })
    expect(params.get("sort")).toBe("price_desc")
  })

  it("includes every populated field and omits empty ones", () => {
    const filters: ListingFilterState = {
      q: "watch",
      category: "electronics",
      state: "Lagos",
      city: "",
      condition: "new",
      minPrice: "5000",
      maxPrice: "",
      sort: "newest",
    }
    const params = listingFiltersToParams(filters)

    expect(params.get("q")).toBe("watch")
    expect(params.get("category")).toBe("electronics")
    expect(params.get("state")).toBe("Lagos")
    expect(params.has("city")).toBe(false)
    expect(params.get("condition")).toBe("new")
    expect(params.get("minPrice")).toBe("5000")
    expect(params.has("maxPrice")).toBe(false)
    expect(params.has("sort")).toBe(false)
  })

  it("round-trips through parseListingFilters", () => {
    const filters: ListingFilterState = {
      q: "boots",
      category: "fashion",
      state: "Rivers",
      city: "Port Harcourt",
      condition: "good",
      minPrice: "1000",
      maxPrice: "20000",
      sort: "price_asc",
    }
    const roundTripped = parseListingFilters(listingFiltersToParams(filters))
    expect(roundTripped).toEqual(filters)
  })
})

describe("listingFilterStateToQuery", () => {
  it("maps empty filter state to an all-undefined query with default sort", () => {
    expect(listingFilterStateToQuery(DEFAULT_LISTING_FILTERS, undefined)).toEqual({
      query: undefined,
      categoryId: undefined,
      state: undefined,
      city: undefined,
      condition: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: "newest",
    })
  })

  it("passes through the resolved categoryId separately from the category slug", () => {
    const filters = { ...DEFAULT_LISTING_FILTERS, category: "electronics" }
    const result = listingFilterStateToQuery(filters, "cat-uuid-123")
    expect(result.categoryId).toBe("cat-uuid-123")
  })

  it("converts price strings to numbers", () => {
    const filters = { ...DEFAULT_LISTING_FILTERS, minPrice: "1000", maxPrice: "50000" }
    const result = listingFilterStateToQuery(filters, undefined)
    expect(result.minPrice).toBe(1000)
    expect(result.maxPrice).toBe(50000)
  })

  it("treats blank price strings as undefined rather than 0 or NaN", () => {
    const result = listingFilterStateToQuery(DEFAULT_LISTING_FILTERS, undefined)
    expect(result.minPrice).toBeUndefined()
    expect(result.maxPrice).toBeUndefined()
  })

  it("treats a non-numeric price string as undefined instead of NaN", () => {
    const filters = { ...DEFAULT_LISTING_FILTERS, minPrice: "not-a-number" }
    const result = listingFilterStateToQuery(filters, undefined)
    expect(result.minPrice).toBeUndefined()
  })
})
