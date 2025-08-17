import React, { useState, useEffect } from 'react';
import * as VIAM from "@viamrobotics/sdk";
import './App.css';
import { 
  handleVideoStoreCommand, 
  formatDuration, 
  formatTimestamp, 
  formatShortTimestamp, 
  extractCameraName 
} from './lib/videoUtils';

interface RunStep {
  name: string;
  start: string;
  end: string;
  duration_ms?: number; // Make optional since new structure doesn't have this
}

interface Readings {
  start: string;
  end: string;
  steps: RunStep[];
  success: boolean;
  pass_id: string;
  err_string?: string | null;
}

interface RunData {
  success: boolean;
  err_string?: string;
  start: string;
  end: string;
  duration_ms: number;
  runs: RunStep[][];
  readings?: Readings; // Add support for old structure
}

interface RunDataDisplayProps {
  runData: RunData | null;
  videoFiles?: VIAM.dataApi.BinaryData[];
  videoStoreClient?: VIAM.GenericComponentClient | null;
  sanderClient?: VIAM.GenericComponentClient | null;
}

const RunDataDisplay: React.FC<RunDataDisplayProps> = ({ runData, videoFiles, sanderClient, videoStoreClient }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [activeView, setActiveView] = useState<'summary' | 'files'>('summary');
  const [base64VideoUrl, setBase64VideoUrl] = useState<string | null>(null);
  const [loadingBase64Video, setLoadingBase64Video] = useState(false);

  // Cleanup video URLs when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (base64VideoUrl && base64VideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(base64VideoUrl);
      }
    };
  }, [base64VideoUrl]);

  const handleVideoStoreCommandWrapper = async () => {
    if (!videoStoreClient) return;
    
    setLoadingBase64Video(true);
    try {
      const result = await handleVideoStoreCommand(videoStoreClient, runData);
      
      if (result.videoUrl) {
        setBase64VideoUrl(result.videoUrl);
      } else if (result.error) {
        alert(`Error fetching video: ${result.error}`);
      }
    } catch (error) {
      console.error("Error in video store command:", error);
      alert("Failed to fetch video from store");
    } finally {
      setLoadingBase64Video(false);
    }
  };

  const toggleStep = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  // Find video files that match a step's timeframe
  const getStepVideos = (step: RunStep) => {
    if (!videoFiles) return [];

    const stepStart = new Date(step.start);
    const stepEnd = new Date(step.end);

    return videoFiles.filter(file => {
      if (!file.metadata?.timeRequested || !file.metadata?.fileName?.endsWith('.mp4')) return false;
      const fileTime = file.metadata.timeRequested.toDate();
      return fileTime >= stepStart && fileTime <= stepEnd;
    });
  };

  // Handle both old and new data structures
  const getRunSteps = () => {
    if (!runData) return [];
    
    // New structure: runData.runs[0]
    if (runData.runs && runData.runs[0]) {
      return runData.runs[0];
    }
    
    // Old structure: runData.readings.steps
    if (runData.readings && runData.readings.steps) {
      return runData.readings.steps;
    }
    
    return [];
  };

  const runSteps = getRunSteps();

  if (!runData) return null;

  const renderSummaryView = () => (
    <>
      <div className="run-summary">
        <div className={`status ${runData.success ? 'success' : 'error'}`}>
          Status: {runData.success ? 'Success' : 'Failed'}
        </div>
        {runData.err_string && (
          <div className="error-message">Error: {runData.err_string}</div>
        )}
        <div className="run-times">
          <div className="time-column">
            <span>Duration: {formatDuration(runData.duration_ms)}</span>
          </div>
          <div className="time-column">
            <span>Start: {formatTimestamp(runData.start)}</span>
            <div className="video-placeholder">📹 Video</div>
          </div>
          <div className="time-column">
            <span>End: {formatTimestamp(runData.end)}</span>
            <div className="video-placeholder">📹 Video</div>
          </div>
          <div className="time-column">
            {/* Reserved for future content */}
          </div>
        </div>
        
        {/* Base64 Video player */}
        {base64VideoUrl && (
          <div className="base64-video-container" style={{ 
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f0f0f0',
            border: '2px solid #28a745',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h4 style={{ margin: 0 }}>Video from Video Store (Base64)</h4>
              <button 
                onClick={() => {
                  if (base64VideoUrl) {
                    URL.revokeObjectURL(base64VideoUrl);
                  }
                  setBase64VideoUrl(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>
            
            <video 
              controls 
              autoPlay
              src={base64VideoUrl}
              style={{ 
                width: '100%', 
                maxWidth: '800px',
                borderRadius: '4px'
              }}
              onError={(e) => {
                console.error("Video playback error:", e);
                alert("Error playing video");
              }}
            />
            
            <div style={{ 
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#d4edda',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#155724',
              textAlign: 'center'
            }}>
              ✅ This video is loaded from base64 data - no CORS issues!
            </div>
            <div style={{ 
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#ddd',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#151515',
              textAlign: 'center'
            }}>
              🥺 Entire video must be loaded before playback
            </div>
          </div>
        )}
        
        {/* Add test button for video store commands */}
        {videoStoreClient && (
          <div className="test-controls">
            <button
              onClick={handleVideoStoreCommandWrapper}
              className="test-video-store-btn"
              disabled={loadingBase64Video}
            >
              {loadingBase64Video ? 'Fetching Video...' : 'Fetch Video from Store'}
            </button>
          </div>
        )}
      </div>

      <h3>Run Steps</h3>
      <div className="run-steps">
        {runSteps.map((step, index) => {
          const stepVideos = getStepVideos(step);
          const isExpanded = expandedSteps.has(index);

          return (
            <div key={index} className="run-step-card">
              <div className="step-header" onClick={() => toggleStep(index)}>
                <div className="step-info">
                  <div className="step-name">{step.name}</div>
                  <div className="step-timeline">
                    <div className="step-time">
                      <span className="time-label">Start</span>
                      <span className="time-value">{formatShortTimestamp(step.start)}</span>
                    </div>
                    <div className="timeline-arrow">→</div>
                    <div className="step-time">
                      <span className="time-label">End</span>
                      <span className="time-value">{formatShortTimestamp(step.end)}</span>
                    </div>
                  </div>
                  <div className="step-duration">{formatDuration(step.duration_ms, step.start, step.end)}</div>
                </div>
                <div className="step-videos-summary">
                  <span className="video-count">{stepVideos.length} videos</span>
                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </div>
              </div>

              {isExpanded && stepVideos.length > 0 && (
                <div className="step-videos-expanded">
                  <div className="videos-grid">
                    {stepVideos.map((video, videoIndex) => (
                      <div key={videoIndex} className="video-card">
                        <div className="video-info">
                          <div className="camera-name">📹 {extractCameraName(video.metadata?.fileName || '')}</div>
                          <div className="video-time">
                            {video.metadata?.timeRequested ?
                              formatShortTimestamp(video.metadata.timeRequested.toDate().toISOString()) :
                              'Unknown time'
                            }
                          </div>
                        </div>
                        <div className="video-actions">
                          <a
                            href={video.metadata?.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="video-link-btn"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isExpanded && stepVideos.length === 0 && (
                <div className="no-videos-message">
                  No videos found for this step
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  const renderFilesView = () => (
    <div className="files-view">
      {sanderClient && (
        <div className="sander-controls">
          <button
            onClick={() => {
              console.log("sanding");
              // sanderClient.doCommand(command)
            }}
            className="start-sanding-btn"
          >
            Start Sanding
          </button>
        </div>
      )}
      <div className="files-grid">
        {videoFiles?.map((item: VIAM.dataApi.BinaryData, index: number) => (
          <div key={index} className="file-item">
            <div className="file-info">
              <div className="file-name">{item.metadata?.fileName || 'Unknown file'}</div>
              <div className="file-timestamp">
                {item.metadata?.timeRequested ?
                  formatTimestamp(item.metadata.timeRequested.toDate().toISOString()) :
                  'Unknown time'
                }
              </div>
            </div>
            <div className="file-actions">
              {item.metadata?.uri && (
                <a
                  href={item.metadata.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-link-btn"
                >
                  View
                </a>
              )}
            </div>
          </div>
        )) || <div className="no-files">No files available</div>}
      </div>
    </div>
  );

  return (
    <div className="run-data-section">
      <div className="section-nav">
        <button
          className={`section-nav-item ${activeView === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveView('summary')}
        >
          Latest Run Summary
        </button>
        <button
          className={`section-nav-item ${activeView === 'files' ? 'active' : ''}`}
          onClick={() => setActiveView('files')}
        >
          Robot operator
        </button>
      </div>

      <div className="section-content">
        {activeView === 'summary' && renderSummaryView()}
        {activeView === 'files' && renderFilesView()}
      </div>
    </div>
  );
};

export default RunDataDisplay;