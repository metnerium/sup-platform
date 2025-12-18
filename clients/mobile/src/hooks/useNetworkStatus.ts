import {useEffect, useState} from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState<string>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setNetworkType(state.type);
    });

    return () => unsubscribe();
  }, []);

  return {
    isConnected,
    networkType,
  };
};
