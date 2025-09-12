// Location API for place name search using Geoapify
const GEOAPIFY_API_KEY = '6bbfc7e0fe0f4f6983a61b7d1b5a97b6' // You should move this to environment variables

export interface Location {
  id: string
  name: string
  state?: string
  country?: string
  full_name: string
  lat?: number
  lon?: number
}

// Helper function for fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
      throw new Error('Backend unavailable')
    }
    throw error
  }
}

export async function searchLocations(query: string): Promise<Location[]> {
  // Only search if query has 3+ characters
  if (query.length < 3) {
    return []
  }

  try {
    // Use Geoapify Places API for location search
    const geoapifyUrl = `https://api.geoapify.com/v2/places?categories=administrative&filter=name:${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=10`
    
    const response = await fetchWithTimeout(geoapifyUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Transform Geoapify response to our Location interface
    const locations: Location[] = data.features?.map((feature: { id?: string; properties: Record<string, string>; geometry?: { coordinates: [number, number] } }, index: number) => {
      const properties = feature.properties
      const geometry = feature.geometry
      
      return {
        id: feature.id || `loc_${index}`,
        name: properties.city || properties.name || properties.address_line1 || '',
        state: properties.state || properties.county || '',
        country: properties.country || '',
        full_name: properties.formatted || `${properties.city || properties.name}, ${properties.state || ''} ${properties.country || ''}`.replace(/\s+/g, ' ').trim(),
        lat: geometry?.coordinates?.[1],
        lon: geometry?.coordinates?.[0]
      }
    }) || []
    
    return locations
  } catch (error) {
    // Fallback to mock data if backend is not available
    console.warn('Backend unavailable for location search, using mock data')
    
    // Mock location data with international cities and common job locations
    const mockLocations: Location[] = [
      // USA
      { id: 'loc_1', name: 'New York', state: 'New York', country: 'USA', full_name: 'New York, NY, USA' },
      { id: 'loc_2', name: 'San Francisco', state: 'California', country: 'USA', full_name: 'San Francisco, CA, USA' },
      { id: 'loc_3', name: 'Los Angeles', state: 'California', country: 'USA', full_name: 'Los Angeles, CA, USA' },
      { id: 'loc_4', name: 'Seattle', state: 'Washington', country: 'USA', full_name: 'Seattle, WA, USA' },
      { id: 'loc_5', name: 'Boston', state: 'Massachusetts', country: 'USA', full_name: 'Boston, MA, USA' },
      { id: 'loc_6', name: 'Chicago', state: 'Illinois', country: 'USA', full_name: 'Chicago, IL, USA' },
      { id: 'loc_7', name: 'Austin', state: 'Texas', country: 'USA', full_name: 'Austin, TX, USA' },
      { id: 'loc_8', name: 'Denver', state: 'Colorado', country: 'USA', full_name: 'Denver, CO, USA' },
      
      // Canada
      { id: 'loc_9', name: 'Toronto', state: 'Ontario', country: 'Canada', full_name: 'Toronto, ON, Canada' },
      { id: 'loc_10', name: 'Vancouver', state: 'British Columbia', country: 'Canada', full_name: 'Vancouver, BC, Canada' },
      { id: 'loc_11', name: 'Montreal', state: 'Quebec', country: 'Canada', full_name: 'Montreal, QC, Canada' },
      
      // UK
      { id: 'loc_12', name: 'London', state: 'England', country: 'UK', full_name: 'London, England, UK' },
      { id: 'loc_13', name: 'Manchester', state: 'England', country: 'UK', full_name: 'Manchester, England, UK' },
      { id: 'loc_14', name: 'Edinburgh', state: 'Scotland', country: 'UK', full_name: 'Edinburgh, Scotland, UK' },
      
      // Germany
      { id: 'loc_15', name: 'Berlin', state: 'Berlin', country: 'Germany', full_name: 'Berlin, Germany' },
      { id: 'loc_16', name: 'Munich', state: 'Bavaria', country: 'Germany', full_name: 'Munich, Bavaria, Germany' },
      { id: 'loc_17', name: 'Frankfurt', state: 'Hesse', country: 'Germany', full_name: 'Frankfurt, Hesse, Germany' },
      
      // Netherlands
      { id: 'loc_18', name: 'Amsterdam', state: 'North Holland', country: 'Netherlands', full_name: 'Amsterdam, Netherlands' },
      { id: 'loc_19', name: 'Rotterdam', state: 'South Holland', country: 'Netherlands', full_name: 'Rotterdam, Netherlands' },
      
      // France
      { id: 'loc_20', name: 'Paris', state: 'Île-de-France', country: 'France', full_name: 'Paris, France' },
      { id: 'loc_21', name: 'Lyon', state: 'Auvergne-Rhône-Alpes', country: 'France', full_name: 'Lyon, France' },
      
      // Australia
      { id: 'loc_22', name: 'Sydney', state: 'New South Wales', country: 'Australia', full_name: 'Sydney, NSW, Australia' },
      { id: 'loc_23', name: 'Melbourne', state: 'Victoria', country: 'Australia', full_name: 'Melbourne, VIC, Australia' },
      
      // Singapore
      { id: 'loc_24', name: 'Singapore', state: '', country: 'Singapore', full_name: 'Singapore' },
      
      // India
      { id: 'loc_25', name: 'Mumbai', state: 'Maharashtra', country: 'India', full_name: 'Mumbai, Maharashtra, India' },
      { id: 'loc_26', name: 'Delhi', state: 'Delhi', country: 'India', full_name: 'Delhi, Delhi, India' },
      { id: 'loc_27', name: 'Bangalore', state: 'Karnataka', country: 'India', full_name: 'Bangalore, Karnataka, India' },
      { id: 'loc_28', name: 'Hyderabad', state: 'Telangana', country: 'India', full_name: 'Hyderabad, Telangana, India' },
      { id: 'loc_29', name: 'Chennai', state: 'Tamil Nadu', country: 'India', full_name: 'Chennai, Tamil Nadu, India' },
      { id: 'loc_30', name: 'Kolkata', state: 'West Bengal', country: 'India', full_name: 'Kolkata, West Bengal, India' },
      { id: 'loc_31', name: 'Pune', state: 'Maharashtra', country: 'India', full_name: 'Pune, Maharashtra, India' },
      { id: 'loc_32', name: 'Ahmedabad', state: 'Gujarat', country: 'India', full_name: 'Ahmedabad, Gujarat, India' },
      
      // Switzerland
      { id: 'loc_33', name: 'Zurich', state: 'Zurich', country: 'Switzerland', full_name: 'Zurich, Switzerland' },
      { id: 'loc_34', name: 'Geneva', state: 'Geneva', country: 'Switzerland', full_name: 'Geneva, Switzerland' },
      
      // Japan
      { id: 'loc_35', name: 'Tokyo', state: 'Tokyo', country: 'Japan', full_name: 'Tokyo, Japan' },
      { id: 'loc_36', name: 'Osaka', state: 'Osaka', country: 'Japan', full_name: 'Osaka, Japan' },
      
      // Remote/Hybrid options
      { id: 'loc_37', name: 'Remote', state: '', country: '', full_name: 'Remote' },
      { id: 'loc_38', name: 'Hybrid', state: '', country: '', full_name: 'Hybrid' },
      { id: 'loc_39', name: 'Work from Home', state: '', country: '', full_name: 'Work from Home' },
      { id: 'loc_40', name: 'Flexible Location', state: '', country: '', full_name: 'Flexible Location' },
      
      // UAE
      { id: 'loc_41', name: 'Dubai', state: 'Dubai', country: 'UAE', full_name: 'Dubai, UAE' },
      { id: 'loc_42', name: 'Abu Dhabi', state: 'Abu Dhabi', country: 'UAE', full_name: 'Abu Dhabi, UAE' },
      
      // Israel
      { id: 'loc_43', name: 'Tel Aviv', state: 'Tel Aviv', country: 'Israel', full_name: 'Tel Aviv, Israel' },
      
      // Ireland
      { id: 'loc_44', name: 'Dublin', state: 'Leinster', country: 'Ireland', full_name: 'Dublin, Ireland' }
    ]
    
    // Filter mock locations based on query
    const filteredLocations = mockLocations.filter(location => 
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      (location.state && location.state.toLowerCase().includes(query.toLowerCase())) ||
      (location.full_name && location.full_name.toLowerCase().includes(query.toLowerCase()))
    )
    
    return filteredLocations.slice(0, 10) // Return max 10 results
  }
}