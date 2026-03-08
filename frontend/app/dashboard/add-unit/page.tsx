'use client'

import { useState } from 'react'

const inputBase =
  'w-full rounded-xl border border-primary-200 bg-white px-4 py-2.5 text-zinc-900 placeholder-zinc-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'

export default function AddUnitPage() {
  const [apartmentName, setApartmentName] = useState('')
  const [roomType, setRoomType] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [sqFt, setSqFt] = useState('')
  const [floor, setFloor] = useState('')
  const [windows, setWindows] = useState('')
  const [price, setPrice] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // No backend connection yet - form does nothing on submit
  }

  return (
    <div className="-m-6 flex min-h-[calc(100vh-3.5rem-3rem)] flex-1 flex-col p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary-800">
          Add Unit
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Add a new unit to the WAMP+ database.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-xl"
      >
        <div className="rounded-2xl border border-primary-200 bg-white shadow-sm">
          <div className="border-b border-primary-100 px-6 py-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              Apartment
            </h2>
            <div className="mt-4">
              <label
                htmlFor="apartmentName"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Apartment name
              </label>
              <input
                id="apartmentName"
                type="text"
                value={apartmentName}
                onChange={(e) => setApartmentName(e.target.value)}
                placeholder="e.g. 26 West"
                className={inputBase}
              />
            </div>
          </div>

          <div className="border-b border-primary-100 px-6 py-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-600">
              Unit details
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="roomType"
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Room type / layout
                </label>
                <input
                  id="roomType"
                  type="text"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  placeholder="e.g. 2B/2B A"
                  className={inputBase}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="bedrooms"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Bedrooms
                  </label>
                  <input
                    id="bedrooms"
                    type="number"
                    min={0}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="0"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label
                    htmlFor="bathrooms"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Bathrooms
                  </label>
                  <input
                    id="bathrooms"
                    type="number"
                    min={0}
                    step={0.5}
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="0"
                    className={inputBase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="sqFt"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Sq ft
                  </label>
                  <input
                    id="sqFt"
                    type="number"
                    min={0}
                    value={sqFt}
                    onChange={(e) => setSqFt(e.target.value)}
                    placeholder="0"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label
                    htmlFor="floor"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Floor
                  </label>
                  <input
                    id="floor"
                    type="number"
                    min={0}
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="0"
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="windows"
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Windows
                </label>
                <input
                  id="windows"
                  type="text"
                  value={windows}
                  onChange={(e) => setWindows(e.target.value)}
                  placeholder="e.g. East, South"
                  className={inputBase}
                />
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Price (monthly rent)
                </label>
                <input
                  id="price"
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1500"
                  className={inputBase}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <button
              type="submit"
              className="w-full rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
