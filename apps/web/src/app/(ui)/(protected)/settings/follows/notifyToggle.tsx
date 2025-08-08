'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { notifyStreamToggle } from '@/lib/form/actions';

export default function NotifyToggle(props: Props) {
  const [toggled, setToggled] = useState(props.toggled);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    notifyStreamToggle(props.channel).then((res) => {
      if (res.success) {
        setToggled(res.toggle!);
      }
    });
    setIsLoading(false);
  };

  return <Switch checked={toggled} onCheckedChange={handleToggle} disabled={isLoading} />;
}

interface Props {
  channel: string;
  toggled: boolean;
}
