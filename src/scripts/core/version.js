export class Version
{
	static isVersionHigherThan(version, checkVersion)
	{
		if(version != undefined)
		{
			checkVersion = checkVersion.replace(/[^\d.-]/g, '').split('.');
			var givenVersion = version.replace(/[^\d.-]/g, '').split('.');
			var flag = true;
			if(checkVersion.length != givenVersion.length)
			{
				return false;
			}
			for (var i=0;i<checkVersion.length;i++)
			{
				var a = parseInt(checkVersion[i]);
				var b = parseInt(givenVersion[i]);
				flag &= (a >= b);
			}
			return flag;
			
		}
		return false;
	}
		
	static getInformalVersion()
	{
		return '0.0.2a';
	}
	
	static getTechnicalVersion()
	{
		return '0.0.2a';
	}
}