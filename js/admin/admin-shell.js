(async function protectAdminPage(){
  const logoutButton=document.getElementById("logout-btn");
  if(logoutButton) logoutButton.addEventListener("click",async()=>{await supabaseClient.auth.signOut();window.location.href="login.html";});
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){window.location.href="login.html";return;}
  const {data:profile,error}=await supabaseClient.from("profiles").select("id,active").eq("id",session.user.id).single();
  if(error||!profile||profile.active===false){await supabaseClient.auth.signOut();window.location.href="login.html";}
})();
