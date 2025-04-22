import { useState, useRef, useEffect } from 'react';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [targetCoord, setTargetCoord] = useState({ lat: 0, lng: 0 });
  const [currentCoord, setCurrentCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [inRadius, setInRadius] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(() => setError('Cannot access camera'));
    } else {
      setError('Camera not supported');
    }
  }, []);

  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const dataUrl = canvasRef.current.toDataURL('image/png');
    setPhoto(dataUrl);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentCoord({ lat: latitude, lng: longitude });
          const dist = haversineDistance(latitude, longitude, targetCoord.lat, targetCoord.lng);
          setDistance(dist);
          setInRadius(dist <= 3);
          setError(null);
        },
        () => setError('Unable to retrieve location')
      );
    } else {
      setError('Geolocation not supported');
    }
  };

  const handleTargetCoordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parts = value.split(',').map(part => part.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setTargetCoord({ lat, lng });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 font-sans">
      <h1 className="text-3xl font-bold mb-6">Photo with Location Checker</h1>

      <div className="mb-4 w-full max-w-md">
        <label htmlFor="targetCoord" className="block mb-2 font-semibold">Paste Target Coordinate (lat, lng):</label>
        <input
          id="targetCoord"
          type="text"
          placeholder="e.g. 37.7749, -122.4194"
          onChange={handleTargetCoordChange}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-4 w-full max-w-md">
        <video ref={videoRef} className="w-full rounded shadow-md" />
      </div>

      <button
        onClick={takePicture}
        className="mb-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Take Picture
      </button>

      {photo && (
        <div className="mb-4 w-full max-w-md">
          <img src={photo} alt="Captured" className="w-full rounded shadow-md" />
        </div>
      )}

      {currentCoord && (
        <div className="mb-2">
          <p>Current Location: {currentCoord.lat.toFixed(6)}, {currentCoord.lng.toFixed(6)}</p>
        </div>
      )}

      {distance !== null && (
        <div className="mb-2">
          <p>Distance to Target: {distance.toFixed(2)} km</p>
          <p>
            {inRadius ? (
              <span className="text-green-600 font-semibold">Within 3 km radius</span>
            ) : (
              <span className="text-red-600 font-semibold">Outside 3 km radius</span>
            )}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-2 text-red-600 font-semibold">
          <p>{error}</p>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
