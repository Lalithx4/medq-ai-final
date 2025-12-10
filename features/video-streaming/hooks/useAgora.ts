// Agora RTC Hook for Video Streaming
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  ILocalVideoTrack,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng';

interface UseAgoraProps {
  appId: string;
  channel: string;
  token: string;
  uid: number;
  role: 'host' | 'audience';
  onUserJoined?: (user: IAgoraRTCRemoteUser) => void;
  onUserLeft?: (user: IAgoraRTCRemoteUser) => void;
  onError?: (error: Error) => void;
}

interface AgoraState {
  isJoined: boolean;
  isPublishing: boolean;
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  screenTrack: ILocalVideoTrack | null;
}

export function useAgora({
  appId,
  channel,
  token,
  uid,
  role,
  onUserJoined,
  onUserLeft,
  onError,
}: UseAgoraProps) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [state, setState] = useState<AgoraState>({
    isJoined: false,
    isPublishing: false,
    localAudioTrack: null,
    localVideoTrack: null,
    remoteUsers: [],
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    screenTrack: null,
  });

  // Initialize client
  useEffect(() => {
    const client = AgoraRTC.createClient({ 
      mode: 'live', 
      codec: 'vp8',
    });

    // Set client role
    client.setClientRole(role === 'host' ? 'host' : 'audience');

    clientRef.current = client;

    // Event listeners
    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        setState(prev => ({
          ...prev,
          remoteUsers: [...prev.remoteUsers.filter(u => u.uid !== user.uid), user],
        }));
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }

      onUserJoined?.(user);
    });

    client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'video') {
        setState(prev => ({
          ...prev,
          remoteUsers: prev.remoteUsers.map(u => 
            u.uid === user.uid ? user : u
          ),
        }));
      }
    });

    client.on('user-left', (user) => {
      setState(prev => ({
        ...prev,
        remoteUsers: prev.remoteUsers.filter(u => u.uid !== user.uid),
      }));
      onUserLeft?.(user);
    });

    client.on('exception', (event) => {
      console.error('Agora exception:', event);
    });

    return () => {
      client.removeAllListeners();
    };
  }, [role, onUserJoined, onUserLeft]);

  // Join channel
  const join = useCallback(async () => {
    const client = clientRef.current;
    if (!client || state.isJoined) return;

    try {
      await client.join(appId, channel, token, uid);
      setState(prev => ({ ...prev, isJoined: true }));
    } catch (error) {
      console.error('Failed to join:', error);
      onError?.(error as Error);
    }
  }, [appId, channel, token, uid, state.isJoined, onError]);

  // Leave channel
  const leave = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !state.isJoined) return;

    try {
      // Stop and close local tracks
      if (state.localAudioTrack) {
        state.localAudioTrack.stop();
        state.localAudioTrack.close();
      }
      if (state.localVideoTrack) {
        state.localVideoTrack.stop();
        state.localVideoTrack.close();
      }
      if (state.screenTrack) {
        state.screenTrack.stop();
        state.screenTrack.close();
      }

      await client.leave();

      setState({
        isJoined: false,
        isPublishing: false,
        localAudioTrack: null,
        localVideoTrack: null,
        remoteUsers: [],
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        screenTrack: null,
      });
    } catch (error) {
      console.error('Failed to leave:', error);
      onError?.(error as Error);
    }
  }, [state, onError]);

  // Publish local tracks (for hosts)
  const publish = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !state.isJoined || state.isPublishing) return;

    try {
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {},
        {
          encoderConfig: {
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMin: 600,
            bitrateMax: 1500,
          },
        }
      );

      await client.publish([audioTrack, videoTrack]);

      setState(prev => ({
        ...prev,
        isPublishing: true,
        localAudioTrack: audioTrack,
        localVideoTrack: videoTrack,
      }));
    } catch (error) {
      console.error('Failed to publish:', error);
      onError?.(error as Error);
    }
  }, [state.isJoined, state.isPublishing, onError]);

  // Unpublish local tracks
  const unpublish = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !state.isPublishing) return;

    try {
      if (state.localAudioTrack) {
        await client.unpublish(state.localAudioTrack);
        state.localAudioTrack.stop();
        state.localAudioTrack.close();
      }
      if (state.localVideoTrack) {
        await client.unpublish(state.localVideoTrack);
        state.localVideoTrack.stop();
        state.localVideoTrack.close();
      }

      setState(prev => ({
        ...prev,
        isPublishing: false,
        localAudioTrack: null,
        localVideoTrack: null,
      }));
    } catch (error) {
      console.error('Failed to unpublish:', error);
    }
  }, [state]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (state.localAudioTrack) {
      await state.localAudioTrack.setEnabled(!state.isAudioEnabled);
      setState(prev => ({ ...prev, isAudioEnabled: !prev.isAudioEnabled }));
    }
  }, [state.localAudioTrack, state.isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (state.localVideoTrack) {
      await state.localVideoTrack.setEnabled(!state.isVideoEnabled);
      setState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
    }
  }, [state.localVideoTrack, state.isVideoEnabled]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !state.isJoined || state.isScreenSharing) return;

    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_2',
      }, 'disable');

      // Unpublish camera video if publishing
      if (state.localVideoTrack) {
        await client.unpublish(state.localVideoTrack);
      }

      if (Array.isArray(screenTrack)) {
        await client.publish(screenTrack[0]);
        setState(prev => ({
          ...prev,
          isScreenSharing: true,
          screenTrack: screenTrack[0],
        }));
      } else {
        await client.publish(screenTrack);
        setState(prev => ({
          ...prev,
          isScreenSharing: true,
          screenTrack,
        }));
      }

      // Handle screen share stop
      (Array.isArray(screenTrack) ? screenTrack[0] : screenTrack).on('track-ended', () => {
        stopScreenShare();
      });
    } catch (error) {
      console.error('Failed to start screen share:', error);
      onError?.(error as Error);
    }
  }, [state.isJoined, state.isScreenSharing, state.localVideoTrack, onError]);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !state.screenTrack) return;

    try {
      await client.unpublish(state.screenTrack);
      state.screenTrack.stop();
      state.screenTrack.close();

      // Re-publish camera video if available
      if (state.localVideoTrack) {
        await client.publish(state.localVideoTrack);
      }

      setState(prev => ({
        ...prev,
        isScreenSharing: false,
        screenTrack: null,
      }));
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }, [state.screenTrack, state.localVideoTrack]);

  // Switch camera
  const switchCamera = useCallback(async (deviceId: string) => {
    if (state.localVideoTrack) {
      await state.localVideoTrack.setDevice(deviceId);
    }
  }, [state.localVideoTrack]);

  // Switch microphone
  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (state.localAudioTrack) {
      await state.localAudioTrack.setDevice(deviceId);
    }
  }, [state.localAudioTrack]);

  // Get available devices
  const getDevices = useCallback(async () => {
    const cameras = await AgoraRTC.getCameras();
    const microphones = await AgoraRTC.getMicrophones();
    const speakers = await AgoraRTC.getPlaybackDevices();
    return { cameras, microphones, speakers };
  }, []);

  return {
    client: clientRef.current,
    ...state,
    join,
    leave,
    publish,
    unpublish,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    getDevices,
  };
}
