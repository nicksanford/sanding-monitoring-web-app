import React, { useState, useEffect } from 'react';
import * as VIAM from "@viamrobotics/sdk";

interface CameraSelectorProps {
  robotClient: VIAM.RobotClient | null;
  onCameraSelected: (cameraName: string | null) => void;
}

interface Resource {
  name: string;
  type: string;
  subtype: string;
}

const CameraSelector: React.FC<CameraSelectorProps> = ({ 
  robotClient, 
  onCameraSelected 
}) => {
  const [cameras, setCameras] = useState<Resource[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available cameras when robotClient changes
  useEffect(() => {
    const fetchCameras = async () => {
      if (!robotClient) {
        setCameras([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get resource names from the robot client
        const resourceNames = await robotClient.resourceNames();
        
        // Filter for components with type "component" and subtype "camera"
        const filteredResources = resourceNames.filter(
          (resource: any) => 
            resource.type === "component" && 
            resource.subtype === "camera"
        );

        setCameras(filteredResources);
        
        // Clear selection when resources change
        setSelectedCamera('');
        onCameraSelected(null);
      } catch (err) {
        console.error('Failed to fetch cameras:', err);
        setError('Failed to fetch available cameras');
        setCameras([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCameras();
  }, [robotClient, onCameraSelected]);

  const handleCameraSelect = (cameraName: string) => {
    setSelectedCamera(cameraName);
    console.log("Camera selected:", cameraName);
    onCameraSelected(cameraName || null);
  };

  if (!robotClient) {
    return (
      <div className="camera-selector">
        <div className="text-gray-500 text-sm">
          Robot not connected
        </div>
      </div>
    );
  }

  return (
    <div className="camera-selector mb-4">
      <label htmlFor="camera-select" className="block text-sm font-medium text-gray-700 mb-2">
        Select Camera Resource
      </label>
      
      <div className="space-y-3">
        {/* Dropdown for cameras */}
        <div className="relative">
          <select
            id="camera-select"
            value={selectedCamera}
            onChange={(e) => handleCameraSelect(e.target.value)}
            disabled={isLoading}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {isLoading ? 'Loading cameras...' : 'Select a camera resource'}
            </option>
            {cameras.map((camera) => (
              <option key={camera.name} value={camera.name}>
                {camera.name}
              </option>
            ))}
          </select>
          
          {isLoading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {cameras.length === 0 && !isLoading && !error && (
        <div className="mt-2 text-sm text-gray-500">
          No camera resources found
        </div>
      )}

      {selectedCamera && (
        <div className="mt-2 text-sm text-green-600">
          ✓ Connected to: {selectedCamera}
        </div>
      )}
    </div>
  );
};

export default CameraSelector;