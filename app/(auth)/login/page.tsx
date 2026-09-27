"use client";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {CarFront} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {loginDefaults,loginSchema,type LoginFormValues} from '@/lib/forms';
import {apiMode,login} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Form,FormControl,FormField,FormItem,FormLabel,FormMessage} from '@/components/ui/form';
import {Card} from '@/components/ui/card';

export default function LoginPage(){
 const router=useRouter();
 const form=useForm<LoginFormValues>({resolver:zodResolver(loginSchema),defaultValues:loginDefaults});
 const [formError,setFormError]=useState('');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{if(!apiMode)router.replace('/')},[router]);
 if(!apiMode)return null;

 const submit=form.handleSubmit(async values=>{
  setFormError('');setBusy(true);
  try{await login(values.username.trim(),values.password);router.push('/')}
  catch(e){setFormError((e as Error).message)}
  finally{setBusy(false)}
 });

 return <Card className="auth-card">
  <div className="auth-brand"><div className="brand-mark"><CarFront size={22}/></div><strong>RentFlow</strong></div>
  <h1>Sign in</h1>
  <p className="settings-copy">Use your RentFlow account to reach the live workspace.</p>
  <Form {...form}>
   <form onSubmit={submit} noValidate className="auth-form">
    <FormField control={form.control} name="username" render={({field})=><FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} autoFocus autoComplete="username"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="password" render={({field})=><FormItem><FormLabel>Password</FormLabel><FormControl><Input {...field} type="password" autoComplete="current-password"/></FormControl><FormMessage/></FormItem>}/>
    {formError&&<p role="alert" className="form-error">{formError}</p>}
    <Button type="submit" disabled={busy} className="auth-submit">{busy?'Signing in...':'Sign in'}</Button>
   </form>
  </Form>
  <p className="auth-switch">New workspace? <Link href="/register">Create one</Link></p>
 </Card>;
}
