"use client";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {CarFront} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {registerDefaults,registerSchema,type RegisterFormValues} from '@/lib/forms';
import {apiMode,register} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Form,FormControl,FormField,FormItem,FormLabel,FormMessage} from '@/components/ui/form';
import {Card} from '@/components/ui/card';

export default function RegisterPage(){
 const router=useRouter();
 const form=useForm<RegisterFormValues>({resolver:zodResolver(registerSchema),defaultValues:registerDefaults});
 const [formError,setFormError]=useState('');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{if(!apiMode)router.replace('/')},[router]);
 if(!apiMode)return null;

 const submit=form.handleSubmit(async values=>{
  setFormError('');setBusy(true);
  try{
   await register({organizationName:values.organizationName.trim(),username:values.username.trim(),email:values.email.trim(),password:values.password});
   router.push('/');
  }
  catch(e){setFormError((e as Error).message)}
  finally{setBusy(false)}
 });

 return <Card className="auth-card">
  <div className="auth-brand"><div className="brand-mark"><CarFront size={22}/></div><strong>RentFlow</strong></div>
  <h1>Create your workspace</h1>
  <p className="settings-copy">Sets up a new organization with you as administrator.</p>
  <Form {...form}>
   <form onSubmit={submit} noValidate className="auth-form">
    <FormField control={form.control} name="organizationName" render={({field})=><FormItem><FormLabel>Company or workspace name</FormLabel><FormControl><Input {...field} autoFocus placeholder="e.g. RentFlow HQ"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="username" render={({field})=><FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} autoComplete="username"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="email" render={({field})=><FormItem><FormLabel>Email (optional)</FormLabel><FormControl><Input {...field} type="email" autoComplete="email"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="password" render={({field})=><FormItem><FormLabel>Password</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="confirmPassword" render={({field})=><FormItem><FormLabel>Confirm password</FormLabel><FormControl><Input {...field} type="password" autoComplete="new-password"/></FormControl><FormMessage/></FormItem>}/>
    {formError&&<p role="alert" className="form-error">{formError}</p>}
    <Button type="submit" disabled={busy} className="auth-submit">{busy?'Creating workspace...':'Create workspace'}</Button>
   </form>
  </Form>
  <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
 </Card>;
}
